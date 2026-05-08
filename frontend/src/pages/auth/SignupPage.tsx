import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthCard } from '../../components/auth/AuthCard';
import { PasswordInput } from '../../components/auth/PasswordInput';
import { OAuthButton } from '../../components/auth/OAuthButton';
import { OtpInput } from '../../components/auth/OtpInput';
import { TfaMethodSelector } from '../../components/auth/TfaMethodSelector';
import { QrCodeSetup } from '../../components/auth/QrCodeSetup';
import { supabase } from '../../lib/supabaseClient';

type Step = 'credentials' | 'verify-email' | 'choose-2fa' | 'setup-totp';

const API = import.meta.env.VITE_API_URL as string;

export function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userId, setUserId] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [totpQr, setTotpQr] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSignup() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json() as { userId?: string; error?: string };
      if (!res.ok) { setError(data.error ?? 'Signup failed'); return; }
      setUserId(data.userId ?? '');
      setStep('verify-email');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyEmail() {
    setError('');
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.verifyOtp({
        email,
        token: emailCode,
        type: 'signup',
      });
      if (err) { setError(err.message); return; }
      setStep('choose-2fa');
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectTotp() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/setup-totp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email }),
      });
      const data = await res.json() as { qrDataUrl?: string; secret?: string; error?: string };
      if (!res.ok) { setError(data.error ?? 'Failed to setup TOTP'); return; }
      setTotpQr(data.qrDataUrl ?? '');
      setTotpSecret(data.secret ?? '');
      setStep('setup-totp');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmTotp() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/verify-totp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, token: totpCode }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error ?? 'Invalid code'); return; }
      navigate('/login');
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
        <div>
          <h1 style={{ color: 'var(--color-surface-0)', fontSize: '24px', fontWeight: 700, marginBottom: 'var(--space-1)' }}>
            Create your account
          </h1>
          <p style={{ color: 'var(--color-text-tertiary)', fontSize: '14px' }}>
            Start with one free project — no card required.
          </p>
        </div>

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
            <label style={labelStyle} htmlFor="password">Password</label>
            <PasswordInput value={password} onChange={setPassword} id="password" autoComplete="new-password" />
            <p style={{ color: 'var(--color-text-tertiary)', fontSize: '12px', marginTop: 'var(--space-1)' }}>
              Must be at least 12 characters
            </p>
          </div>
        </div>

        {error && <p style={{ color: 'var(--color-error)', fontSize: '13px' }}>{error}</p>}

        <button type="button" onClick={() => void handleSignup()} disabled={loading} style={primaryBtn}>
          {loading ? 'Creating account...' : 'Create account'}
        </button>

        <p style={{ color: 'var(--color-text-tertiary)', fontSize: '13px', textAlign: 'center' }}>
          Already have an account?{' '}
          <a href="/login" style={{ color: 'var(--color-brand)' }}>Sign in</a>
        </p>

        <p style={{ color: 'var(--color-success-bright)', fontSize: '12px', textAlign: 'center' }}>
          ✓ 2FA required to protect your project
        </p>
      </div>
    </AuthCard>
  );

  if (step === 'verify-email') return (
    <AuthCard>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <div>
          <h1 style={{ color: 'var(--color-surface-0)', fontSize: '24px', fontWeight: 700, marginBottom: 'var(--space-1)' }}>
            Check your email
          </h1>
          <p style={{ color: 'var(--color-text-tertiary)', fontSize: '14px' }}>
            We sent a 6-digit code to {email}
          </p>
        </div>
        <OtpInput value={emailCode} onChange={setEmailCode} />
        {error && <p style={{ color: 'var(--color-error)', fontSize: '13px', textAlign: 'center' }}>{error}</p>}
        <button type="button" onClick={() => void handleVerifyEmail()} disabled={loading || emailCode.length < 6} style={primaryBtn}>
          {loading ? 'Verifying...' : 'Verify email'}
        </button>
      </div>
    </AuthCard>
  );

  if (step === 'choose-2fa') return (
    <AuthCard>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <div>
          <h1 style={{ color: 'var(--color-surface-0)', fontSize: '24px', fontWeight: 700, marginBottom: 'var(--space-1)' }}>
            Set up two-factor authentication
          </h1>
          <p style={{ color: 'var(--color-text-tertiary)', fontSize: '14px' }}>
            Required to protect your account and prevent abuse.
          </p>
        </div>
        <TfaMethodSelector
          onSelectTotp={() => void handleSelectTotp()}
          onSelectEmail={() => navigate('/login')}
        />
        {error && <p style={{ color: 'var(--color-error)', fontSize: '13px' }}>{error}</p>}
      </div>
    </AuthCard>
  );

  if (step === 'setup-totp') return (
    <AuthCard>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <div>
          <h1 style={{ color: 'var(--color-surface-0)', fontSize: '24px', fontWeight: 700, marginBottom: 'var(--space-1)' }}>
            Scan this QR code
          </h1>
          <p style={{ color: 'var(--color-text-tertiary)', fontSize: '14px' }}>
            Open your authenticator app and scan:
          </p>
        </div>
        <QrCodeSetup
          qrDataUrl={totpQr}
          secret={totpSecret}
          code={totpCode}
          onCodeChange={setTotpCode}
          onConfirm={() => void handleConfirmTotp()}
          onShowBackupCodes={() => {}}
          loading={loading}
          error={error}
        />
      </div>
    </AuthCard>
  );

  return null;
}