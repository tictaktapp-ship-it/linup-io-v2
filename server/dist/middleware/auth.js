import { supabase } from '../lib/supabase.js';
export async function requireAuth(request, reply) {
    try {
        // Accept Bearer token from Authorization header OR cookie
        const authHeader = request.headers['authorization'];
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.slice(7);
            try {
                request.user = request.server.jwt.verify(token);
            }
            catch {
                return reply.status(401).send({ error: 'Invalid token' });
            }
        }
        else {
            await request.jwtVerify();
        }
        if (request.user.two_factor_verified !== true) {
            return reply.status(401).send({ error: 'Two-factor verification required' });
        }
        const userId = request.user.sub;
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
    }
    catch {
        return reply.status(401).send({ error: 'Unauthorized' });
    }
}
//# sourceMappingURL=auth.js.map