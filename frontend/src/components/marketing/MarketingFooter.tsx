import { Link } from 'react-router-dom';

// Doc 5 Screen 1 Footer: Logo | Links | © 2026 LINUP · linup.io

export function MarketingFooter() {
  return (
    <footer style={{
      borderTop: '1px solid rgba(255,255,255,0.06)',
      padding: '40px 40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '16px',
      background: 'var(--color-dark-0)',
    }}>
      {/* Logo */}
      <Link to="/" style={{
        fontFamily: 'var(--font-sans)',
        fontWeight: 700,
        fontSize: '16px',
        letterSpacing: '-0.02em',
        background: 'linear-gradient(135deg, #8C00B4 0%, #C44DFF 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        textDecoration: 'none',
      }}>
        LINUP
      </Link>

      {/* Links */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
        {[
          { label: 'Pricing', href: '/pricing' },
          { label: 'About',   href: '/about' },
          { label: 'Sign in', href: '/login' },
        ].map(({ label, href }) => (
          <Link key={label} to={href} style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '13px',
            fontWeight: 400,
            color: 'var(--color-surface-3)',
            textDecoration: 'none',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-surface-1)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-surface-3)')}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Copyright */}
      <span style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '13px',
        color: 'var(--color-surface-3)',
      }}>
        © 2026 LINUP · linup.io
      </span>
    </footer>
  );
}