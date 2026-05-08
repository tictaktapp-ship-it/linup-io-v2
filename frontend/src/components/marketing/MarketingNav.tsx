import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// Doc 5 Screen 1: sticky nav with backdrop blur on scroll
// Auth-aware: checks linup_session cookie client-side
// Unauthenticated: [Sign in] [Start free ->]
// Authenticated:   [Go to app ->]

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [authed, setAuthed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setAuthed(document.cookie.includes('linup_session='));

    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 40px',
      background: scrolled
        ? 'rgba(12, 12, 14, 0.85)'
        : 'transparent',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
      borderBottom: scrolled
        ? '1px solid rgba(255,255,255,0.06)'
        : '1px solid transparent',
      transition: 'background 0.2s ease, border-color 0.2s ease',
    }}>
      {/* Logo */}
      <Link to="/" style={{
        fontFamily: 'var(--font-sans)',
        fontWeight: 700,
        fontSize: '18px',
        letterSpacing: '-0.02em',
        background: 'linear-gradient(135deg, #8C00B4 0%, #C44DFF 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        textDecoration: 'none',
      }}>
        LINUP
      </Link>

      {/* Centre links */}
      <div style={{
        display: 'flex',
        gap: '32px',
        alignItems: 'center',
      }}>
        {[
          { label: 'Features', href: '/#features' },
          { label: 'Pricing',  href: '/pricing' },
          { label: 'About',    href: '/about' },
        ].map(({ label, href }) => (
          <Link key={label} to={href} style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--color-surface-2)',
            textDecoration: 'none',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-surface-0)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-surface-2)')}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Right CTAs */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        {authed ? (
          <button
            onClick={() => navigate('/app')}
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '14px',
              fontWeight: 600,
              background: '#8C00B4',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 18px',
              cursor: 'pointer',
            }}
          >
            Go to app →
          </button>
        ) : (
          <>
            <button
              onClick={() => navigate('/login')}
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '14px',
                fontWeight: 500,
                background: 'transparent',
                color: 'var(--color-surface-2)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '6px',
                padding: '8px 16px',
                cursor: 'pointer',
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                e.currentTarget.style.color = 'var(--color-surface-0)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                e.currentTarget.style.color = 'var(--color-surface-2)';
              }}
            >
              Sign in
            </button>
            <button
              onClick={() => navigate('/signup')}
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '14px',
                fontWeight: 600,
                background: '#8C00B4',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 18px',
                cursor: 'pointer',
              }}
            >
              Start free →
            </button>
          </>
        )}
      </div>
    </nav>
  );
}