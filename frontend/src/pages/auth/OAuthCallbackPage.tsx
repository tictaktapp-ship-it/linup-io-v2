import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

const API = import.meta.env.VITE_API_URL as string;

// /auth/oauth/callback
// Supabase redirects here after Google/GitHub OAuth.
// This page exchanges the Supabase session for a LINUP session cookie.
// Doc 11 D4: OAuth accounts get two_factor_verified: true (unless TOTP enabled).
export function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      // 1. Get the Supabase session from the URL hash/code
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setError('OAuth sign-in failed. Please try again.');
        return;
      }

      // 2. Extract provider identity
      const user = session.user;
      const provider = user.app_metadata['provider'] as 'google' | 'github' | undefined;
      const provider_id = user.user_metadata['provider_id'] as string | undefined
        ?? user.user_metadata['sub'] as string | undefined
        ?? user.id;

      if (!provider || (provider !== 'google' && provider !== 'github')) {
        setError('Unsupported OAuth provider.');
        return;
      }

      // 3. Exchange Supabase access token for LINUP session cookie
      const res = await fetch(`${API}/api/auth/oauth/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          access_token: session.access_token,
          provider,
          provider_id,
        }),
      });

      const data = await res.json() as {
        message?: string;
        twoFactorRequired?: boolean;
        userId?: string;
        error?: string;
      };

      if (!res.ok) {
        setError(data.error ?? 'Authentication failed. Please try again.');
        return;
      }

      // 4a. If TOTP is enabled on this OAuth account — route to 2FA challenge
      if (data.twoFactorRequired && data.userId) {
        navigate(`/verify-2fa?userId=${data.userId}`);
        return;
      }

      // 4b. LINUP session cookie is now set — go to app
      navigate('/app');
    })();
  }, [navigate]);

  const cardStyle = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--color-dark-1)',
  } as const;

  const boxStyle = {
    textAlign: 'center' as const,
    color: 'var(--color-text-secondary)',
    fontSize: '14px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  };

  if (error) return (
    <div style={cardStyle}>
      <div style={boxStyle}>
        <p style={{ color: 'var(--color-error)' }}>{error}</p>
        <a href="/login" style={{ color: 'var(--color-brand)' }}>Back to sign in</a>
      </div>
    </div>
  );

  return (
    <div style={cardStyle}>
      <div style={boxStyle}>
        <p>Completing sign-in...</p>
      </div>
    </div>
  );
}