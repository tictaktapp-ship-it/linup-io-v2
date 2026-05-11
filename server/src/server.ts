import * as Sentry from '@sentry/node';

// Sentry must be initialised before any other imports (Doc 8D Phase 10)
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',
  tracesSampleRate: 0.1,
});

import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import fastifyRateLimit from '@fastify/rate-limit';
import { authRoutes } from './api/auth.js';
import { projectRoutes } from './api/projects.js';
import { secretsRoutes } from './api/secrets.js';
import { pipelineRoutes } from './api/pipeline.js';
import { downloadsRoutes } from './api/downloads.js';
import { mecRoutes } from './api/mec.js';
import { webhookRoutes } from './api/webhooks.js';
import { notificationRoutes } from './routes/notifications.js';
import { councilRoutes } from './api/council.js';
import { oauthRoutes } from './api/oauth.js';
import { founderRoutes } from './api/founder.js';

const fastify = Fastify({ logger: true });

// --- Plugins ---
await fastify.register(fastifyCookie, {
  secret: process.env.COOKIE_SECRET!,
  hook: 'onRequest',
});

// --- Rate limiting (Doc 11 D7) --- in-memory store; swap to Redis when Upstash configured
await fastify.register(fastifyRateLimit, {
  max: 200,
  timeWindow: '1 minute',
  addHeaders: {
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true,
    'retry-after': true,
  },
  errorResponseBuilder: (_req: any, context: any) => ({
    statusCode: 429,
    error: 'RATE_LIMITED',
    message: 'Too many requests. Retry after ' + context.after + '.',
  }),
});

await fastify.register(fastifyJwt, {
  secret: process.env.JWT_SECRET!,
  cookie: {
    cookieName: 'linup_session',
    signed: true,
  },
});

// --- Routes ---
await fastify.register(authRoutes);
await fastify.register(projectRoutes);
await fastify.register(secretsRoutes);
await fastify.register(pipelineRoutes);
await fastify.register(downloadsRoutes);
await fastify.register(mecRoutes);
await fastify.register(webhookRoutes);
await fastify.register(notificationRoutes);
await fastify.register(councilRoutes);
await fastify.register(oauthRoutes);
await fastify.register(founderRoutes);

// --- Sentry error handler ---
fastify.setErrorHandler((error: any, _request, reply) => {
  Sentry.captureException(error);
  fastify.log.error(error);
  reply.status((error as any).statusCode ?? 500).send({ error: (error as any).message ?? 'Internal Server Error' });
});

// --- Health check (unauthenticated) ---
fastify.get('/health', async () => ({
  status: 'ok',
  mock_ai: process.env.MOCK_AI === 'true',
  timestamp: new Date().toISOString(),
}));

// --- Start ---
const start = async () => {
  try {
    await fastify.listen({
      port: Number(process.env.PORT ?? 3000),
      host: '0.0.0.0',
    });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();