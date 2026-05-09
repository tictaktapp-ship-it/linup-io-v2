import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, Lock } from 'lucide-react';

export function NewProjectPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gated, setGated] = useState(false);

  const nameValid = name.trim().length >= 2 && name.trim().length <= 80;
  const canSubmit = nameValid && !submitting;

  async function handleCreate() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    setGated(false);

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
      });

      if (res.status === 401) { navigate('/login', { replace: true }); return; }

      if (res.status === 409) {
        const body = await res.json();
        if (body.code === 'FREE_PROJECT_USED') {
          setGated(true);
          return;
        }
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message ?? 'Failed to create project. Please try again.');
        return;
      }

      const data = await res.json();
      navigate(/app/project/, { replace: true });
    } catch {
      setError('Could not reach the server. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Free project gate state ─────────────────────────────────────────────────
  if (gated) {
    return (
      <div style={{
        maxWidth: '480px',
        margin: '0 auto',
        paddingTop: 'var(--space-12)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
      }}>
        <div style={{
          background: 'var(--color-dark-1)',
          border: '1px solid var(--color-border-dark)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-8)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-5)',
          alignItems: 'center',
          textAlign: 'center',
        }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: 'var(--radius-xl)',
            background: 'var(--color-dark-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Lock size={24} strokeWidth={1.5} color="var(--color-brand)" />
          </div>

          <div>
            <div style={{
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--color-text-on-dark)',
              marginBottom: 'var(--space-2)',
              letterSpacing: '-0.01em',
            }}>Your free project is in use</div>
            <div style={{
              fontSize: '14px',
              color: 'var(--color-text-on-dark-2)',
              lineHeight: 1.6,
            }}>
              The free tier includes one project. Upgrade to Pro for unlimited projects, priority processing, and all downloads included.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', width: '100%' }}>
            <button
              onClick={() => navigate('/app/billing')}
              style={{
                height: '44px',
                background: 'var(--color-brand)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 'var(--radius-lg)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 120ms ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-brand-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-brand)')}
            >
              Upgrade to Pro — £149/month
            </button>
            <button
              onClick={() => navigate('/app')}
              style={{
                height: '36px',
                background: 'transparent',
                color: 'var(--color-text-on-dark-2)',
                border: 'none',
                borderRadius: 'var(--radius-lg)',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Back to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Create form ─────────────────────────────────────────────────────────────
  return (
    <div style={{
      maxWidth: '560px',
      margin: '0 auto',
      paddingTop: 'var(--space-12)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-6)',
    }}>
      {/* Back link */}
      <button
        onClick={() => navigate('/app')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          background: 'transparent',
          border: 'none',
          color: 'var(--color-text-on-dark-2)',
          fontSize: '13px',
          cursor: 'pointer',
          padding: 0,
          alignSelf: 'flex-start',
        }}
      >
        <ArrowLeft size={14} strokeWidth={1.5} />
        Back to dashboard
      </button>

      {/* Card */}
      <div style={{
        background: 'var(--color-dark-1)',
        border: '1px solid var(--color-border-dark)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-8)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
      }}>
        <div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 600,
            color: 'var(--color-text-on-dark)',
            letterSpacing: '-0.02em',
            marginBottom: 'var(--space-2)',
          }}>New project</h1>
          <p style={{
            fontSize: '14px',
            color: 'var(--color-text-on-dark-2)',
            lineHeight: 1.6,
          }}>
            Give your project a name. Your AI engineering department will take it from there.
          </p>
        </div>

        {/* Project name */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <label style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--color-text-on-dark)',
          }}>
            Project name <span style={{ color: 'var(--color-error)' }}>*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
            placeholder="e.g. TechStart App"
            maxLength={80}
            autoFocus
            style={{
              height: '40px',
              padding: '0 var(--space-4)',
              background: 'var(--color-dark-2)',
              border: '1px solid var(--color-border-dark)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-on-dark)',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 120ms ease, box-shadow 120ms ease',
            }}
            onFocus={e => {
              e.target.style.borderColor = 'var(--color-border-focus)';
              e.target.style.boxShadow = 'var(--shadow-focus)';
            }}
            onBlur={e => {
              e.target.style.borderColor = 'var(--color-border-dark)';
              e.target.style.boxShadow = 'none';
            }}
          />
          <div style={{ fontSize: '11px', color: 'var(--color-text-on-dark-2)', textAlign: 'right' }}>
            {name.length}/80
          </div>
        </div>

        {/* Description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <label style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--color-text-on-dark)',
          }}>
            Brief description <span style={{ color: 'var(--color-text-on-dark-2)', fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What does this product do? A sentence or two is fine — your team will ask more questions."
            maxLength={400}
            rows={3}
            style={{
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--color-dark-2)',
              border: '1px solid var(--color-border-dark)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-on-dark)',
              fontSize: '14px',
              outline: 'none',
              resize: 'vertical',
              lineHeight: 1.6,
              transition: 'border-color 120ms ease, box-shadow 120ms ease',
              fontFamily: 'var(--font-sans)',
            }}
            onFocus={e => {
              e.target.style.borderColor = 'var(--color-border-focus)';
              e.target.style.boxShadow = 'var(--shadow-focus)';
            }}
            onBlur={e => {
              e.target.style.borderColor = 'var(--color-border-dark)';
              e.target.style.boxShadow = 'none';
            }}
          />
          <div style={{ fontSize: '11px', color: 'var(--color-text-on-dark-2)', textAlign: 'right' }}>
            {description.length}/400
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-3) var(--space-4)',
            background: 'rgba(220,38,38,0.08)',
            border: '1px solid rgba(220,38,38,0.2)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-error)',
            fontSize: '13px',
          }}>
            <AlertCircle size={14} strokeWidth={1.5} />
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleCreate}
          disabled={!canSubmit}
          style={{
            height: '44px',
            background: canSubmit ? 'var(--color-brand)' : 'var(--color-dark-3)',
            color: canSubmit ? '#FFFFFF' : 'var(--color-text-on-dark-2)',
            border: 'none',
            borderRadius: 'var(--radius-lg)',
            fontSize: '14px',
            fontWeight: 600,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-2)',
            transition: 'background 120ms ease',
          }}
          onMouseEnter={e => { if (canSubmit) e.currentTarget.style.background = 'var(--color-brand-hover)'; }}
          onMouseLeave={e => { if (canSubmit) e.currentTarget.style.background = 'var(--color-brand)'; }}
        >
          {submitting ? (
            <>
              <Loader2 size={14} strokeWidth={1.5} style={{ animation: 'spin 1s linear infinite' }} />
              Creating project…
            </>
          ) : (
            'Create project →'
          )}
        </button>
      </div>

      <style>{
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      }</style>
    </div>
  );
}