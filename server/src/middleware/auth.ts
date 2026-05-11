import type { FastifyRequest, FastifyReply } from 'fastify';
import { supabase } from '../lib/supabase.js';

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
    // 1. Verify JWT signature and expiry
    await request.jwtVerify();

    // 2. Check two_factor_verified claim
    if (request.user.two_factor_verified !== true) {
      return reply.status(401).send({ error: 'Two-factor verification required' });
    }

    const userId = request.user.sub;

    // 3. Check user_profile exists
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError || !profile) {
      return reply.status(401).send({ error: 'User not found' });
    }

    // 4. Get organisation membership
    const { data: membership } = await supabase
      .from('organisation_members')
      .select('organisation_id, organisations(is_active)')
      .eq('user_id', userId)
      .maybeSingle();

    if (!membership) {
      return reply.status(401).send({ error: 'No organisation found' });
    }

    const org = membership.organisations as unknown as { is_active: boolean } | null;
    if (!org?.is_active) {
      return reply.status(401).send({ error: 'Organisation suspended' });
    }

    // 5. Attach resolved profile to request
    request.profile = {
      id: userId,
      email: request.user.email,
      organisation_id: membership.organisation_id,
    };
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
}