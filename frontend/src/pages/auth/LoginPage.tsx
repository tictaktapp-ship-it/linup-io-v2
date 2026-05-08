import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthCard } from '../../components/auth/AuthCard';
import { PasswordInput } from '../../components/auth/PasswordInput';
import { OAuthButton } from '../../components/auth/OAuthButton';
import { OtpInput } from '../../components/auth/OtpInput';
import { supabase } from '../../lib/supabaseClient';

type Step = 'credentials' | 'verify-2fa';

const API = import.meta.env.VITE_API_URL as string;

export function LoginPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userId, setUserId] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json() as { userId?: string; error?: string };
      if (!res.ok) { setError(data.error ?? 'Invalid email or password'); return; }
      setUserId(data.userId ?? '');
      setStep('verify-2fa');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify2fa() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/verify-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId, token: code }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error ?? 'Invalid code'); return; }
      navigate('/app');
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: 'google' | 'github') {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/app` },
    });
  }

  const labelStyle = {
    display: 'block',
    color: 'var(--color-text-tertiary)',
    fontSize: '13px',
    marginBottom: 'var(--space-1)',
  } as const;

  const inputStyle = {
    width: '100%',
    height: '36px',
    padding: '0 var(--space-3)',
    border: '1px solid var(--color-dark-3)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--color-dark-2)',
    color: 'var(--color-surface-0)',
    fontSize: '14px',
    outline: 'none',
  } as const;

  const primaryBtn = {
    width: '100%',
    height: '40px',
    background: 'var(--color-brand)',
    color: 'var(--color-text-on-purple)',
    border: 'none',
    borderRadius: 'var(--radius-lg)',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    opacity: loading ? 0.7 : 1,
  } as const;

  const dividerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    color: 'var(--color-text-tertiary)',
    fontSize: '12px',
  } as const;

  const line = { flex: 1, height: '1px', background: 'var(--color-dark-3)' } as const;

  if (step === 'credentials') return (
    <AuthCard>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <h1 style={{ color: 'var(--color-surface-0)', fontSize: '24px', fontWeight: 700 }}>
          Welcome back
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <OAuthButton provider="google" onClick={() => void handleOAuth('google')} />
          <OAuthButton provider="github" onClick={() => void handleOAuth('github')} />
        </div>

        <div style={dividerStyle}><div style={line} />or<div style={line} /></div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <label style={labelStyle} htmlFor="email">Email address</label>
            <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
              style={inputStyle} autoComplete="email" />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
              <label style={labelStyle} htmlFor="password">Password</label>
              <a href="/forgot-password" style={{ color: 'var(--color-text-tertiary)', fontSize: '13px' }}>
                Forgot password?
              </a>
            </div>
            <PasswordInput value={password} onChange={setPassword} id="password" />
          </div>
        </div>

        {error && <p style={{ color: 'var(--color-error)', fontSize: '13px' }}>{error}</p>}

        <button type="button" onClick={() => void handleLogin()} disabled={loading} style={primaryBtn}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>

        <p style={{ color: 'var(--color-text-tertiary)', fontSize: '13px', textAlign: 'center' }}>
          Don&apos;t have an account?{' '}
          <a href="/signup" style={{ color: 'var(--color-brand)' }}>Sign up</a>
        </p>
      </div>
    </AuthCard>
  );

  if (step === 'verify-2fa') return (
    <AuthCard>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <div>
          <h1 style={{ color: 'var(--color-surface-0)', fontSize: '24px', fontWeight: 700, marginBottom: 'var(--space-1)' }}>
            Two-factor authentication
          </h1>
          <p style={{ color: 'var(--color-text-tertiary)', fontSize: '14px' }}>
            Enter the code from your authenticator app.
          </p>
        </div>
        <OtpInput value={code} onChange={setCode} />
        {error && <p style={{ color: 'var(--color-error)', fontSize: '13px', textAlign: 'center' }}>{error}</p>}
        <button type="button" onClick={() => void handleVerify2fa()} disabled={loading || code.length < 6} style={primaryBtn}>
          {loading ? 'Verifying...' : 'Verify'}
        </button>
        <p style={{ color: 'var(--color-text-tertiary)', fontSize: '13px', textAlign: 'center' }}>
          Using a different device?{' '}
          <a href="/backup-code" style={{ color: 'var(--color-brand)' }}>Enter a backup code</a>
        </p>
      </div>
    </AuthCard>
  );

  return null;
}