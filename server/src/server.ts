import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import { authRoutes } from './api/auth.js';
import { projectRoutes } from './api/projects.js';
import { secretsRoutes } from './api/secrets.js';
import { pipelineRoutes } from './api/pipeline.js';
import { downloadsRoutes } from './api/downloads.js';
import { mecRoutes } from './api/mec.js';
import { webhookRoutes } from './api/webhooks.js';

const fastify = Fastify({ logger: true });

// --- Plugins ---
await fastify.register(fastifyCookie, {
  secret: process.env.COOKIE_SECRET!,
  hook: 'onRequest',
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