import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
const API = import.meta.env.VITE_API_URL as string;

export function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [detail, setDetail] = useState('Processing...');

  useEffect(() => {
    void (async () => {
      const url = window.location.href;
      const hash = window.location.hash;
      const search = window.location.search;
      setDetail('URL params: ' + search + ' | Hash: ' + hash.slice(0, 50));

      // PKCE flow: code in query string
      const code = new URLSearchParams(search).get('code');
      if (code) {
        setDetail('Found code, exchanging for session...');
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError || !data.session) {
          setError('Session exchange failed: ' + (exchangeError?.message ?? 'no session'));
          return;
        }
        await completeOAuth(data.session.access_token, data.session.user, navigate, setError, setDetail);
        return;
      }

      // Implicit flow: tokens in hash
      if (hash.includes('access_token')) {
        setDetail('Found hash tokens, parsing...');
        const params = new URLSearchParams(hash.slice(1));
        const access_token = params.get('access_token') ?? '';
        const refresh_token = params.get('refresh_token') ?? '';
        const { data, error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
        if (sessionError || !data.session) {
          setError('setSession failed: ' + (sessionError?.message ?? 'no session'));
          return;
        }
        await completeOAuth(data.session.access_token, data.session.user, navigate, setError, setDetail);
        return;
      }

      setError('No OAuth code or token found in URL. Search: ' + search + ' Hash: ' + hash.slice(0, 100));
    })();
  }, [navigate]);

  const cardStyle = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-dark-1)' } as const;
  const boxStyle = { textAlign: 'center' as const, color: 'var(--color-text-secondary)', fontSize: '14px', display: 'flex', flexDirection: 'column' as const, gap: '12px', maxWidth: '600px', padding: '20px' };

  return (
    <div style={cardStyle}>
      <div style={boxStyle}>
        {error ? (
          <>
            <p style={{ color: 'var(--color-error)' }}>{error}</p>
            <p style={{ color: '#888', fontSize: '11px', wordBreak: 'break-all' }}>{detail}</p>
            <a href="/login" style={{ color: 'var(--color-brand)' }}>Back to sign in</a>
          </>
        ) : (
          <>
            <p>Completing sign-in...</p>
            <p style={{ color: '#888', fontSize: '11px' }}>{detail}</p>
          </>
        )}
      </div>
    </div>
  );
}

async function completeOAuth(
  accessToken: string,
  user: { app_metadata: Record<string, unknown>; user_metadata: Record<string, unknown>; id: string },
  navigate: (path: string) => void,
  setError: (e: string) => void,
  setDetail: (d: string) => void
) {
  // Check identities array for OAuth provider
  const identities = (user as unknown as { identities?: Array<{ provider: string; id: string }> }).identities ?? [];
  const oauthIdentity = identities.find(i => i.provider === 'google' || i.provider === 'github');
  const provider = (oauthIdentity?.provider ?? user.app_metadata['provider']) as 'google' | 'github' | undefined;
  const provider_id = oauthIdentity?.id ?? user.user_metadata['provider_id'] as string | undefined
    ?? user.user_metadata['sub'] as string | undefined
    ?? user.id;
  setDetail('Provider: ' + provider + ' | Identities: ' + identities.map(i => i.provider).join(',') + ' | Calling backend...');
  if (!provider || (provider !== 'google' && provider !== 'github')) {
    setError('Unsupported OAuth provider: ' + String(provider) + ' | Identities: ' + identities.map(i => i.provider).join(','));
    return;
  }
  try {
    const res = await fetch(`${API}/api/auth/oauth/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ access_token: accessToken, provider, provider_id }),
    });
    const text = await res.text();
    setDetail('Backend: ' + res.status + ' | ' + text.slice(0, 200));
    if (!res.ok) { setError('Backend error ' + res.status + ': ' + text.slice(0, 200)); return; }
    const data = JSON.parse(text) as { twoFactorRequired?: boolean; userId?: string; };
    if (data.twoFactorRequired && data.userId) { navigate('/verify-2fa?userId=' + data.userId); return; }
    navigate('/app');
  } catch (e) {
    setError('Network error: ' + String(e));
  }
}