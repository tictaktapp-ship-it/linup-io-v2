import type { FastifyRequest, FastifyReply } from 'fastify';
import { supabase } from '../lib/supabase.js';

// Correct augmentation pattern for @fastify/jwt — extend UserType, not FastifyRequest directly
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string;
      email: string;
      two_factor_verified: boolean;
      auth_method?: 'PASSWORD' | 'GOOGLE' | 'GITHUB';
    };
    user: {
      sub: string;
      email: string;
      two_factor_verified: boolean;
      auth_method?: 'PASSWORD' | 'GOOGLE' | 'GITHUB';
    };
  }
}

// Attach resolved profile to request after auth (separate from JWT payload)
declare module 'fastify' {
  interface FastifyRequest {
    profile: {
      id: string;
      email: string;
      organisation_id: string;
    };
  }
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // 1. Verify JWT signature and expiry (throws if invalid/expired)
    await request.jwtVerify();

    // 2. Check two_factor_verified claim (Doc 3: Session Management)
    if (request.user.two_factor_verified !== true) {
      return reply.status(401).send({ error: 'Two-factor verification required' });
    }

    // 3. Load user profile and check organisation is active (Doc 3)
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, email, organisation_id, organisations(is_active)')
      .eq('id', request.user.sub)
      .single();

    if (error || !profile) {
      return reply.status(401).send({ error: 'User not found' });
    }

    const orgs = profile.organisations as unknown as { is_active: boolean }[] | null;
    const org = Array.isArray(orgs) ? orgs[0] : null;
    if (!org?.is_active) {
      return reply.status(401).send({ error: 'Organisation suspended' });
    }

    // 4. Attach resolved profile to request
    request.profile = {
      id: profile.id,
      email: profile.email,
      organisation_id: profile.organisation_id,
    };
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
}