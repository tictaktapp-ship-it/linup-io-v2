import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
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
    // Accept Bearer token from Authorization header OR cookie
    const authHeader = request.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        request.user = (request.server as FastifyInstance).jwt.verify(token);
      } catch {
        return reply.status(401).send({ error: 'Invalid token' });
      }
    } else {
      await request.jwtVerify();
    }

    if (request.user.two_factor_verified !== true) {
      return reply.status(401).send({ error: 'Two-factor verification required' });
    }

    const userId = request.user.sub;

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError || !profile) {
      return reply.status(401).send({ error: 'User not found' });
    }

    const { data: membership } = await supabase
      .from('organisation_members')
      .select('organisation_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!membership) {
      return reply.status(401).send({ error: 'No organisation found' });
    }

    request.profile = {
      id: userId,
      email: request.user.email,
      organisation_id: membership.organisation_id,
    };
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
}