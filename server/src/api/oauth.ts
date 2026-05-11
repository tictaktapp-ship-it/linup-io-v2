import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { supabase } from '../lib/supabase.js';

export async function oauthRoutes(fastify: FastifyInstance): Promise<void> {

  // POST /api/auth/oauth/callback
  // Called by frontend after Supabase OAuth redirect completes.
  // Frontend exchanges the Supabase session for a LINUP session cookie.
  // Doc 11 D4: OAuth accounts get two_factor_verified: true unless they have
  // TOTP enabled, in which case they must still pass the TOTP challenge.
  fastify.post('/api/auth/oauth/callback', async (request: FastifyRequest, reply: FastifyReply) => {
    const { access_token, provider, provider_id } = request.body as {
      access_token: string;
      provider: 'google' | 'github';
      provider_id: string;
    };

    if (!access_token || !provider || !provider_id) {
      return reply.status(400).send({ error: 'Missing required OAuth fields.' });
    }

    // 1. Verify the Supabase access token and get user identity
    const { data: { user }, error: userError } = await supabase.auth.getUser(access_token);
    if (userError || !user) {
      return reply.status(401).send({ error: 'Invalid OAuth session.' });
    }

    const authMethod = provider.toUpperCase() as 'GOOGLE' | 'GITHUB';
    const email = user.email ?? '';

    // 2. Check for existing profile via oauth_provider_id (dedup — Doc 11 D4)
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id, organisation_id, auth_method')
      .eq('oauth_provider_id', provider_id)
      .maybeSingle();

    let profileId: string;
    let organisationId: string;

    if (existingProfile) {
      profileId = existingProfile.id;
      organisationId = existingProfile.organisation_id;
    } else {
      const { data: profileByUid } = await supabase
        .from('user_profiles')
        .select('id, organisation_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profileByUid) {
        await supabase
          .from('user_profiles')
          .update({ auth_method: authMethod, oauth_provider_id: provider_id })
          .eq('id', user.id);
        profileId = profileByUid.id;
        organisationId = profileByUid.organisation_id;
      } else {
        const { data: newOrg, error: orgError } = await supabase
          .from('organisations')
          .insert({ name: email.split('@')[0] ?? 'My Organisation', slug: (email.split('@')[0] ?? 'org') + '-' + Date.now(), plan: 'FREE', is_active: true })
          .select('id')
          .single();

        if (orgError || !newOrg) {
          return reply.status(500).send({ error: 'Failed to create organisation.' });
        }

        const { data: newProfile, error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: user.id,
            email,
            organisation_id: newOrg.id,
            auth_method: authMethod,
            oauth_provider_id: provider_id,
          })
          .select('id, organisation_id')
          .single();

        if (profileError || !newProfile) {
          return reply.status(500).send({ error: 'Failed to create user profile.' });
        }

        await supabase.from('organisation_members').insert({
          organisation_id: newOrg.id,
          user_id: user.id,
          role: 'OWNER',
        });

        profileId = newProfile.id;
        organisationId = newProfile.organisation_id;
      }
    }

    // 3. Check if user has TOTP enabled (Doc 11 D4: enforce if voluntarily enabled)
    const { data: userData } = await supabase.auth.admin.getUserById(profileId);
    const totpEnabled = userData?.user?.user_metadata?.['totp_enabled'] === true;

    if (totpEnabled) {
      return reply.status(200).send({
        twoFactorRequired: true,
        userId: profileId,
        message: '2FA required — TOTP is enabled on this account.',
      });
    }

    // 4. Verify organisation is active
    const { data: org } = await supabase
      .from('organisations')
      .select('is_active')
      .eq('id', organisationId)
      .single();

    if (!org?.is_active) {
      return reply.status(401).send({ error: 'Organisation suspended.' });
    }

    // 5. Issue LINUP session JWT — two_factor_verified: true for OAuth (Doc 11 D4)
    const sessionToken = fastify.jwt.sign(
      {
        sub: profileId,
        email,
        two_factor_verified: true,
        auth_method: authMethod,
      },
      { expiresIn: '7d' }
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
}