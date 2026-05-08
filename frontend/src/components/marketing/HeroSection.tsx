import { useNavigate } from 'react-router-dom';

// Doc 5 Screen 1 Hero section
// Brand gradient on H1 text only — flat #8C00B4 on CTA buttons (no gradients on CTAs)

const secondaryLinkStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '15px',
  fontWeight: 500,
  color: 'var(--color-surface-2)',
  textDecoration: 'none',
  padding: '12px 24px',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '7px',
  transition: 'border-color 0.15s, color 0.15s',
  display: 'inline-block',
};

export function HeroSection() {
  const navigate = useNavigate();

  return (
    <section style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '120px 40px 80px',
      background: 'var(--color-dark-0)',
    }}>
      <p style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: '#8C00B4',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}>
        <span style={{ color: '#C44DFF' }}>•</span>
        THE AI CO-FOUNDER FOR NON-TECHNICAL FOUNDERS
      </p>

      <h1 style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 'clamp(40px, 6vw, 72px)',
        fontWeight: 800,
        lineHeight: 1.08,
        letterSpacing: '-0.03em',
        margin: '0 0 24px',
        maxWidth: '780px',
        background: 'linear-gradient(135deg, #FFFFFF 0%, #C44DFF 60%, #8C00B4 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}>
        Build the right thing{'\u003cbr /\u003e'}from the start.
      </h1>

      <p style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '18px',
        fontWeight: 400,
        lineHeight: 1.6,
        color: 'var(--color-surface-2)',
        maxWidth: '560px',
        margin: '0 0 40px',
      }}>
        LINUP runs a full-stack AI engineering department
        that specifies your product before a line of code is written.
      </p>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '24px' }}>
        <button
          onClick={() => navigate('/signup')}
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '15px',
            fontWeight: 600,
            background: '#8C00B4',
            color: '#fff',
            border: 'none',
            borderRadius: '7px',
            padding: '12px 24px',
            cursor: 'pointer',
          }}
        >
          Start for free →
        </button>
        <a href="#how-it-works" style={secondaryLinkStyle}
          onMouseEnter={e => {
            (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.25)';
            (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-surface-0)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.1)';
            (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-surface-2)';
          }}
        >See how it works</a>
      </div>

      <p style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '13px',
        color: 'var(--color-surface-3)',
        margin: 0,
      }}>
        ✓ Free first project · No card required · Login required
      </p>
    </section>
  );
}