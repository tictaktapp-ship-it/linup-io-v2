import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
const API = import.meta.env.VITE_API_URL as string;

export function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [detail, setDetail] = useState('Waiting for session...');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setDetail('Event: ' + event + ' | Session: ' + (session ? 'yes' : 'no'));
      if (event === 'SIGNED_IN' && session) {
        subscription.unsubscribe();
        const user = session.user;
        const provider = user.app_metadata['provider'] as 'google' | 'github' | undefined;
        const provider_id = user.user_metadata['provider_id'] as string | undefined
          ?? user.user_metadata['sub'] as string | undefined
          ?? user.id;
        setDetail('Provider: ' + provider + ' | Calling backend...');
        if (!provider || (provider !== 'google' && provider !== 'github')) {
          setError('Unsupported OAuth provider: ' + provider);
          return;
        }
        try {
          const res = await fetch(`${API}/api/auth/oauth/callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ access_token: session.access_token, provider, provider_id }),
          });
          const text = await res.text();
          setDetail('Backend status: ' + res.status + ' | Body: ' + text.slice(0, 200));
          if (!res.ok) { setError('Backend error ' + res.status + ': ' + text.slice(0, 200)); return; }
          const data = JSON.parse(text) as { twoFactorRequired?: boolean; userId?: string; };
          if (data.twoFactorRequired && data.userId) { navigate('/verify-2fa?userId=' + data.userId); return; }
          navigate('/app');
        } catch (e) {
          setError('Network error: ' + String(e));
        }
      } else if (event === 'INITIAL_SESSION' && !session) {
        setError('No session found after OAuth. Event: ' + event);
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const cardStyle = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-dark-1)' } as const;
  const boxStyle = { textAlign: 'center' as const, color: 'var(--color-text-secondary)', fontSize: '14px', display: 'flex', flexDirection: 'column' as const, gap: '12px', maxWidth: '600px', padding: '20px' };

  return (
    <div style={cardStyle}>
      <div style={boxStyle}>
        {error ? (
          <>
            <p style={{ color: 'var(--color-error)' }}>{error}</p>
            <p style={{ color: '#888', fontSize: '12px' }}>{detail}</p>
            <a href="/login" style={{ color: 'var(--color-brand)' }}>Back to sign in</a>
          </>
        ) : (
          <>
            <p>Completing sign-in...</p>
            <p style={{ color: '#888', fontSize: '12px' }}>{detail}</p>
          </>
        )}
      </div>
    </div>
  );
}