import type { FastifyRequest, FastifyReply } from 'fastify';
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
export declare function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void>;
//# sourceMappingURL=auth.d.ts.map