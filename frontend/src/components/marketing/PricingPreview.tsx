import { useNavigate } from 'react-router-dom';

// Doc 5 Screen 1 Pricing Preview — Free + Pro teaser cards, links to /pricing
// Flat #8C00B4 buttons — no gradients on CTAs (Doc 5 key design decisions)

export function PricingPreview() {
  const navigate = useNavigate();

  return (
    <section style={{
      padding: '100px 40px',
      background: 'var(--color-dark-0)',
      borderTop: '1px solid rgba(255,255,255,0.04)',
    }}>
      <p style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--color-surface-3)',
        textAlign: 'center',
        marginBottom: '16px',
      }}>
        PRICING
      </p>
      <h2 style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 'clamp(28px, 4vw, 42px)',
        fontWeight: 700,
        letterSpacing: '-0.025em',
        color: 'var(--color-surface-0)',
        textAlign: 'center',
        margin: '0 auto 56px',
        maxWidth: '480px',
        lineHeight: 1.2,
      }}>
        Simple, honest pricing.
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px',
        maxWidth: '680px',
        margin: '0 auto 40px',
      }}>
        {/* Free card */}
        <div style={{
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '32px',
          background: 'rgba(255,255,255,0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600, color: 'var(--color-surface-2)', margin: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>FREE</p>
          <div>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '36px', fontWeight: 800, color: 'var(--color-surface-0)', letterSpacing: '-0.03em' }}>£0</span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: 'var(--color-surface-3)', marginLeft: '6px' }}>forever</span>
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              '1 project, free',
              'Full specification PDF',
              'Login + 2FA required',
              'App Package: £199',
            ].map(item => (
              <li key={item} style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: 'var(--color-surface-2)', display: 'flex', gap: '8px' }}>
                <span style={{ color: '#8C00B4' }}>✓</span> {item}
              </li>
            ))}
          </ul>
          <button
            onClick={() => navigate('/signup')}
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '14px',
              fontWeight: 600,
              background: 'transparent',
              color: 'var(--color-surface-0)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '7px',
              padding: '11px 20px',
              cursor: 'pointer',
              marginTop: 'auto',
            }}
          >
            Start for free →
          </button>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--color-surface-3)', margin: 0, textAlign: 'center' }}>No card required</p>
        </div>

        {/* Pro card — highlighted */}
        <div style={{
          border: '1px solid rgba(140,0,180,0.5)',
          borderRadius: '12px',
          padding: '32px',
          background: 'rgba(140,0,180,0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          position: 'relative',
        }}>
          <span style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            fontFamily: 'var(--font-sans)',
            fontSize: '11px',
            fontWeight: 600,
            color: '#C44DFF',
            background: 'rgba(140,0,180,0.2)',
            border: '1px solid rgba(140,0,180,0.4)',
            borderRadius: '100px',
            padding: '3px 10px',
          }}>★ PRO</span>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600, color: '#C44DFF', margin: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>PRO</p>
          <div>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '36px', fontWeight: 800, color: 'var(--color-surface-0)', letterSpacing: '-0.03em' }}>£149</span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: 'var(--color-surface-3)', marginLeft: '6px' }}>/month</span>
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              'Unlimited projects',
              'Priority processing',
              'All downloads included',
              'App Package included',
            ].map(item => (
              <li key={item} style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: 'var(--color-surface-1)', display: 'flex', gap: '8px' }}>
                <span style={{ color: '#C44DFF' }}>✓</span> {item}
              </li>
            ))}
          </ul>
          <button
            onClick={() => navigate('/signup?plan=pro')}
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '14px',
              fontWeight: 600,
              background: '#8C00B4',
              color: '#fff',
              border: 'none',
              borderRadius: '7px',
              padding: '11px 20px',
              cursor: 'pointer',
              marginTop: 'auto',
            }}
          >
            Subscribe to Pro →
          </button>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--color-surface-3)', margin: 0, textAlign: 'center' }}>Cancel any time</p>
        </div>
      </div>

      {/* Link to full pricing page */}
      <p style={{ textAlign: 'center', margin: 0 }}>
        <button
          onClick={() => navigate('/pricing')}
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '14px',
            color: 'var(--color-surface-3)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
          }}
        >
          See full pricing details →
        </button>
      </p>
      <p style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '13px',
        color: 'var(--color-surface-3)',
        textAlign: 'center',
        margin: '12px 0 0',
      }}>
        Additional plans coming soon.
      </p>
    </section>
  );
}