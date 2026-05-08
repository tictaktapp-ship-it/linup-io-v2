import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { supabase } from '../lib/supabase.js';
import { isDisposableEmail, hasValidMxRecord } from '../utils/email-guard.js';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

// IP rate limit store (in-memory; replace with Redis in production per Doc 3)
const signupAttempts = new Map<string, { count: number; resetAt: number }>();

function checkSignupRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = signupAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    signupAttempts.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 3) return false; // Doc 3: max 3 signup attempts per IP per hour
  entry.count++;
  return true;
}

export async function authRoutes(fastify: FastifyInstance): Promise<void> {

  // POST /api/auth/signup — Step 1: create account (Doc 3: Authentication Flow /signup)
  fastify.post('/api/auth/signup', async (request: FastifyRequest, reply: FastifyReply) => {
    const ip = request.ip;
    if (!checkSignupRateLimit(ip)) {
      return reply.status(429).send({ error: 'Too many signup attempts. Try again later.' });
    }

    const { email, password } = request.body as { email: string; password: string };

    // Disposable email check (Doc 3: Free Tier Abuse Prevention)
    if (isDisposableEmail(email)) {
      return reply.status(400).send({ error: 'Disposable email addresses are not allowed.' });
    }
    const mxValid = await hasValidMxRecord(email);
    if (!mxValid) {
      return reply.status(400).send({ error: 'Email domain does not appear to be valid.' });
    }

    // Password length check (Doc 3: /signup Step 1 — min 12 chars)
    if (!password || password.length < 12) {
      return reply.status(400).send({ error: 'Password must be at least 12 characters.' });
    }

    // Create user via Supabase Auth
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      return reply.status(400).send({ error: error.message });
    }

    return reply.status(201).send({
      message: 'Account created. Check your email for a verification code.',
      userId: data.user?.id,
    });
  });

  // POST /api/auth/login — Step 1: credentials (Doc 3: Authentication Flow /login)
  fastify.post('/api/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = request.body as { email: string; password: string };

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return reply.status(401).send({ error: 'Invalid email or password.' });
    }

    // Do NOT issue session cookie yet — 2FA must be verified first (Doc 3)
    return reply.status(200).send({
      message: '2FA required',
      userId: data.user.id,
      twoFactorRequired: true,
    });
  });

  // POST /api/auth/setup-totp — Generate TOTP secret + QR code (Doc 3: 2FA Methods — TOTP)
  fastify.post('/api/auth/setup-totp', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, email } = request.body as { userId: string; email: string };

    const secret = speakeasy.generateSecret({
      name: `LINUP (${email})`,
      length: 20,
    });

    // Store secret temporarily in user metadata (confirmed on verify-totp)
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { totp_secret_pending: secret.base32 },
    });
    if (error) {
      return reply.status(500).send({ error: 'Failed to store TOTP secret.' });
    }

    const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url!);

    return reply.status(200).send({
      secret: secret.base32,
      qrDataUrl,
    });
  });

  // POST /api/auth/verify-totp — Confirm TOTP setup with first code (Doc 3: Step 3a QR setup)
  fastify.post('/api/auth/verify-totp', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, token } = request.body as { userId: string; token: string };

    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError || !userData.user) {
      return reply.status(404).send({ error: 'User not found.' });
    }

    const pendingSecret = userData.user.user_metadata?.['totp_secret_pending'] as string | undefined;
    if (!pendingSecret) {
      return reply.status(400).send({ error: 'No pending TOTP setup found.' });
    }

    const valid = speakeasy.totp.verify({
      secret: pendingSecret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!valid) {
      return reply.status(400).send({ error: 'Invalid code. Please try again.' });
    }

    // Promote pending secret to confirmed
    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        totp_secret: pendingSecret,
        totp_secret_pending: null,
        totp_enabled: true,
      },
    });

    return reply.status(200).send({ message: 'TOTP setup complete.' });
  });

  // POST /api/auth/verify-2fa — 2FA challenge on login (Doc 3: /login 2FA challenge)
  fastify.post('/api/auth/verify-2fa', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, token } = request.body as { userId: string; token: string };

    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError || !userData.user) {
      return reply.status(404).send({ error: 'User not found.' });
    }

    const totpSecret = userData.user.user_metadata?.['totp_secret'] as string | undefined;
    if (!totpSecret) {
      return reply.status(400).send({ error: 'No 2FA method configured.' });
    }

    const valid = speakeasy.totp.verify({
      secret: totpSecret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!valid) {
      return reply.status(401).send({ error: 'Invalid 2FA code.' });
    }

    // Issue signed session JWT with two_factor_verified: true (Doc 3: Session Management)
    const sessionToken = fastify.jwt.sign(
      {
        sub: userId,
        email: userData.user.email ?? '',
        two_factor_verified: true,
      },
      { expiresIn: '7d' } // Doc 3: 7-day rolling session
    );

    return reply
      .setCookie('linup_session', sessionToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      })
      .status(200)
      .send({ message: 'Authenticated.' });
  });

  // POST /api/auth/logout — Clear session cookie (Doc 3: Session Management — Logout)
  fastify.post('/api/auth/logout', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply
      .clearCookie('linup_session', { path: '/' })
      .status(200)
      .send({ message: 'Logged out.' });
  });
}