import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL ?? '';

interface WizardStatus {
  wizard_completed: boolean;
  configured: { supabase: boolean; stripe: boolean; email: boolean; push: boolean; openrouter: boolean; stripe_connect: boolean };
  env_files_generated_at: string | null;
}

interface TestResult { success: boolean; detail: string; }

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: '32px', height: '4px', borderRadius: '2px',
          background: i < current ? 'var(--color-accent)' : i === current ? 'var(--color-accent)' : 'var(--color-border)',
          opacity: i < current ? 0.5 : 1,
        }} />
      ))}
    </div>
  );
}

function Field({ label, hint, warning, value, onChange, placeholder, type = 'text' }: {
  label: string; hint?: string; warning?: string; value: string;
  onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--color-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '10px 12px', color: 'var(--color-text)', fontSize: '13px', fontFamily: 'monospace', boxSizing: 'border-box' }} />
      {hint && <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--color-text-secondary)' }}>{'ℹ ' + hint}</p>}
      {warning && <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--color-warning, #f59e0b)' }}>{'⚠ ' + warning}</p>}
    </div>
  );
}

function TestButton({ service, projectId, onResult }: { service: string; projectId: string; onResult: (r: TestResult) => void }) {
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true);
    try {
      const res = await fetch(API + '/api/secrets/test', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: projectId, service }) });
      const data = await res.json();
      onResult(data);
    } catch { onResult({ success: false, detail: 'Network error' }); }
    setLoading(false);
  };
  return <button onClick={run} disabled={loading} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--color-text)', cursor: 'pointer', fontSize: '13px' }}>{loading ? 'Testing...' : 'Test connection'}</button>;
}

export default function SecretsWizardPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<WizardStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Step field state
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [supabaseServiceKey, setSupabaseServiceKey] = useState('');
  const [stripePk, setStripePk] = useState('');
  const [stripeSk, setStripeSk] = useState('');
  const [stripeWh, setStripeWh] = useState('');
  const [resendKey, setResendKey] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [vapidPublic, setVapidPublic] = useState('');
  const [vapidPrivate, setVapidPrivate] = useState('');
  const [vapidSubject, setVapidSubject] = useState('');
  const [openrouterKey, setOpenrouterKey] = useState('');

  useEffect(() => {
    if (!projectId) return;
    fetch(API + '/api/secrets/status/' + projectId, { credentials: 'include' })
      .then(r => r.json()).then(setStatus).catch(() => {});
  }, [projectId]);

  const saveStep = async (stepName: string, secrets: Record<string, string>) => {
    setSaving(true); setError(null);
    try {
      const res = await fetch(API + '/api/secrets/save', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: projectId, step: stepName, secrets }) });
      if (!res.ok) throw new Error('Save failed');
      setStep(s => s + 1); setTestResult(null);
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  const generateEnv = async () => {
    setSaving(true); setError(null);
    try {
      const res = await fetch(API + '/api/secrets/generate-env', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: projectId }) });
      const data = await res.json();
      if (!res.ok) throw new Error('Generate failed');
      setDownloadUrl(data.download_url);
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  const card: React.CSSProperties = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '32px', maxWidth: '600px', margin: '40px auto' };
  const h2: React.CSSProperties = { fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: '8px' };
  const p: React.CSSProperties = { fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '20px', lineHeight: 1.6 };
  const btnPrimary: React.CSSProperties = { padding: '10px 20px', background: 'var(--color-accent)', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '13px' };
  const btnSecondary: React.CSSProperties = { padding: '10px 20px', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--color-text)', cursor: 'pointer', fontSize: '13px', marginRight: '8px' };

  const steps = ['Supabase', 'Payments', 'Email & Push', 'Advanced', 'Review'];

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: 'var(--color-bg)' }}>
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.05em' }}>🔑 App Configuration Wizard</span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Step {step + 1} of {steps.length}</span>
        </div>
        <StepIndicator current={step} total={steps.length} />

        {step === 0 && (
          <>
            <p style={h2}>SUPABASE</p>
            <p style={p}>Your app uses Supabase for its database, authentication, file storage, and real-time updates. Go to Settings → API in your Supabase project to find these values.</p>
            <Field label='Project URL' placeholder='https://xxxxxxxxxxxx.supabase.co' hint='This is safe to share. It identifies your project.' value={supabaseUrl} onChange={setSupabaseUrl} />
            <Field label='Anon (public) key' placeholder='eyJhbGciO...' hint='Safe to use in client-side code.' value={supabaseAnonKey} onChange={setSupabaseAnonKey} />
            <Field label='Service role key' placeholder='eyJhbGciO...' warning='NEVER share this key or put it in client code. It bypasses all security rules.' value={supabaseServiceKey} onChange={setSupabaseServiceKey} />
            {testResult && <p style={{ fontSize: '13px', color: testResult.success ? 'var(--color-success, #10b981)' : 'var(--color-error, #ef4444)', marginBottom: '12px' }}>{testResult.success ? '✓ ' : '✗ '}{testResult.detail}</p>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              <TestButton service='supabase' projectId={projectId!} onResult={setTestResult} />
              <div>
                <button style={btnSecondary} onClick={() => navigate('/app/project/' + projectId)}>Cancel</button>
                <button style={btnPrimary} disabled={saving || !supabaseUrl || !supabaseAnonKey || !supabaseServiceKey} onClick={() => saveStep('supabase', { supabase_url: supabaseUrl, supabase_anon_key: supabaseAnonKey, supabase_service_role_key: supabaseServiceKey })}>{saving ? 'Saving...' : 'Next: Payments →'}</button>
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <p style={h2}>STRIPE — PAYMENT PROCESSING</p>
            <p style={p}>Your app processes payments through Stripe. Get your API keys from Stripe Dashboard → Developers → API keys.</p>
            <Field label='Publishable key (pk_)' placeholder='pk_live_...' hint='Safe to use in client-side code.' value={stripePk} onChange={setStripePk} />
            <Field label='Secret key (sk_)' placeholder='sk_live_...' warning='NEVER share or expose this key.' value={stripeSk} onChange={setStripeSk} />
            <Field label='Webhook secret (whsec_)' placeholder='whsec_...' hint='From Stripe Dashboard → Developers → Webhooks → your endpoint → Signing secret.' value={stripeWh} onChange={setStripeWh} />
            {testResult && <p style={{ fontSize: '13px', color: testResult.success ? 'var(--color-success, #10b981)' : 'var(--color-error, #ef4444)', marginBottom: '12px' }}>{testResult.success ? '✓ ' : '✗ '}{testResult.detail}</p>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              <TestButton service='stripe' projectId={projectId!} onResult={setTestResult} />
              <div>
                <button style={btnSecondary} onClick={() => { setStep(0); setTestResult(null); }}>Back</button>
                <button style={btnPrimary} disabled={saving || !stripePk || !stripeSk || !stripeWh} onClick={() => saveStep('stripe', { stripe_publishable_key: stripePk, stripe_secret_key: stripeSk, stripe_webhook_secret: stripeWh })}>{saving ? 'Saving...' : 'Next: Email →'}</button>
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p style={h2}>EMAIL & PUSH NOTIFICATIONS</p>
            <p style={p}>Your app sends transactional emails via Resend and push notifications via VAPID. Get your Resend API key at resend.com. Generate VAPID keys by running: npx web-push generate-vapid-keys</p>
            <Field label='Resend API Key (re_)' placeholder='re_...' value={resendKey} onChange={setResendKey} />
            <Field label='From email address' placeholder='noreply@yourdomain.com' hint='Must match your verified domain in Resend.' value={fromEmail} onChange={setFromEmail} />
            <Field label='VAPID Public Key' placeholder='BNxxxxxxx...' hint='This goes in your frontend code too.' value={vapidPublic} onChange={setVapidPublic} />
            <Field label='VAPID Private Key' placeholder='xxxxxxx...' warning='Keep this private — server only.' value={vapidPrivate} onChange={setVapidPrivate} />
            <Field label='VAPID Subject (mailto:)' placeholder='mailto:you@yourdomain.com' value={vapidSubject} onChange={setVapidSubject} />
            {testResult && <p style={{ fontSize: '13px', color: testResult.success ? 'var(--color-success, #10b981)' : 'var(--color-error, #ef4444)', marginBottom: '12px' }}>{testResult.success ? '✓ ' : '✗ '}{testResult.detail}</p>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              <TestButton service='resend' projectId={projectId!} onResult={setTestResult} />
              <div>
                <button style={btnSecondary} onClick={() => { setStep(1); setTestResult(null); }}>Back</button>
                <button style={btnPrimary} disabled={saving || !resendKey || !fromEmail || !vapidPublic || !vapidPrivate || !vapidSubject} onClick={() => saveStep('email', { resend_api_key: resendKey, from_email: fromEmail, vapid_public_key: vapidPublic, vapid_private_key: vapidPrivate, vapid_subject: vapidSubject })}>{saving ? 'Saving...' : 'Next: Advanced →'}</button>
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <p style={h2}>ADVANCED — DOMAIN-SPECIFIC</p>
            <p style={p}>Optional integrations based on your project's domain. Skip any that don't apply to your app.</p>
            <Field label='OpenRouter API Key (sk-or-)' placeholder='sk-or-...' hint='Required if your app uses AI features. Get at openrouter.ai/keys.' value={openrouterKey} onChange={setOpenrouterKey} />
            {testResult && <p style={{ fontSize: '13px', color: testResult.success ? 'var(--color-success, #10b981)' : 'var(--color-error, #ef4444)', marginBottom: '12px' }}>{testResult.success ? '✓ ' : '✗ '}{testResult.detail}</p>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              <TestButton service='openrouter' projectId={projectId!} onResult={setTestResult} />
              <div>
                <button style={btnSecondary} onClick={() => { setStep(2); setTestResult(null); }}>Back</button>
                <button style={btnPrimary} disabled={saving} onClick={() => saveStep('domain', { ...(openrouterKey ? { openrouter_api_key: openrouterKey } : {}) })}>{saving ? 'Saving...' : 'Next: Review →'}</button>
              </div>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <p style={h2}>REVIEW YOUR CONFIGURATION</p>
            {status && (
              <div style={{ marginBottom: '20px' }}>
                {[
                  { key: 'supabase', label: 'Supabase' },
                  { key: 'stripe', label: 'Stripe' },
                  { key: 'email', label: 'Resend + VAPID' },
                  { key: 'openrouter', label: 'OpenRouter' },
                ].map(({ key, label }) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid var(--color-border)', fontSize: '13px' }}>
                    <span>{(status.configured as any)[key] ? '✓' : '○'}</span>
                    <span style={{ color: (status.configured as any)[key] ? 'var(--color-text)' : 'var(--color-text-secondary)' }}>{label}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--color-text-secondary)' }}>{(status.configured as any)[key] ? 'Configured' : 'Not set'}</span>
                  </div>
                ))}
              </div>
            )}
            <p style={{ ...p, fontSize: '12px' }}>All secrets are encrypted with AES-256-GCM before storage. They are never transmitted in plaintext and are never visible to LINUP staff.</p>
            {downloadUrl ? (
              <div style={{ padding: '16px', background: 'var(--color-surface-2, var(--color-surface))', borderRadius: '8px', marginBottom: '16px' }}>
                <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 600 }}>✓ Env files generated</p>
                <a href={downloadUrl} target='_blank' rel='noreferrer' style={{ color: 'var(--color-accent)', fontSize: '13px' }}>Download /config/ files →</a>
              </div>
            ) : null}
            {error && <p style={{ color: 'var(--color-error, #ef4444)', fontSize: '13px', marginBottom: '12px' }}>{'✗ ' + error}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <button style={btnSecondary} onClick={() => { setStep(3); setTestResult(null); }}>Back</button>
              {!downloadUrl && <button style={btnPrimary} disabled={saving} onClick={generateEnv}>{saving ? 'Generating...' : 'Save and generate env files →'}</button>}
              {downloadUrl && <button style={btnPrimary} onClick={() => navigate('/app/project/' + projectId)}>Back to project →</button>}
            </div>
          </>
        )}

        {error && step !== 4 && <p style={{ color: 'var(--color-error, #ef4444)', fontSize: '13px', marginTop: '12px' }}>{'✗ ' + error}</p>}
      </div>
    </div>
  );
}
