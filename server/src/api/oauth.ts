import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { supabase } from '../lib/supabase.js';

export async function oauthRoutes(fastify: FastifyInstance): Promise<void> {

  fastify.post('/api/auth/oauth/callback', async (request: FastifyRequest, reply: FastifyReply) => {
    const { access_token, provider, provider_id } = request.body as {
      access_token: string;
      provider: 'google' | 'github';
      provider_id: string;
    };

    if (!access_token || !provider || !provider_id) {
      return reply.status(400).send({ error: 'Missing required OAuth fields.' });
    }

    // 1. Verify the Supabase access token
    const { data: { user }, error: userError } = await supabase.auth.getUser(access_token);
    if (userError || !user) {
      return reply.status(401).send({ error: 'Invalid OAuth session.' });
    }

    const authMethod = provider.toUpperCase() as 'GOOGLE' | 'GITHUB';
    const email = user.email ?? '';
    const userId = user.id;

    // 2. Check if user_profile already exists (user_id is the PK)
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('user_id, auth_method')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingProfile) {
      // 3. Create organisation for new user
      const emailSlug = email.split('@')[0] ?? 'user';
      const slug = emailSlug.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now();
      const { data: newOrg, error: orgError } = await supabase
        .from('organisations')
        .insert({ name: emailSlug + "'s Organisation", slug, plan: 'FREE' })
        .select('id')
        .single();

      if (orgError || !newOrg) {
        return reply.status(500).send({ error: 'Failed to create organisation: ' + (orgError?.message ?? 'unknown') });
      }

      // 4. Create user_profile (user_id PK, no email/org_id columns)
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({ user_id: userId, auth_method: authMethod, oauth_provider_id: provider_id });

      if (profileError) {
        return reply.status(500).send({ error: 'Failed to create user profile: ' + profileError.message });
      }

      // 5. Create organisation_members entry
      await supabase.from('organisation_members').insert({
        organisation_id: newOrg.id,
        user_id: userId,
        role: 'OWNER',
      });
    } else {
      // Update auth method if changed
      await supabase
        .from('user_profiles')
        .update({ auth_method: authMethod, oauth_provider_id: provider_id })
        .eq('user_id', userId);
    }

    // 6. Check TOTP
    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    const totpEnabled = userData?.user?.user_metadata?.['totp_enabled'] === true;
    if (totpEnabled) {
      return reply.status(200).send({ twoFactorRequired: true, userId, message: '2FA required.' });
    }

    // 7. Get organisation for this user
    const { data: membership } = await supabase
      .from('organisation_members')
      .select('organisation_id')
      .eq('user_id', userId)
      .maybeSingle();

    const organisationId = membership?.organisation_id ?? null;

    // 8. Issue LINUP session JWT
    const sessionToken = fastify.jwt.sign(
      { sub: userId, email, two_factor_verified: true, auth_method: authMethod },
      { expiresIn: '7d' }
    );

    return reply
      .setCookie('linup_session', sessionToken, {
        httpOnly: true,
        sameSite: 'none',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      })
      .status(200)
      .send({ message: 'Authenticated.' });
  });
}