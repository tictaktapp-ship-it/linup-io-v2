import { useState } from 'react';
import { Link } from 'react-router-dom';

export function MarketingFooter() {
  const [logoFailed, setLogoFailed] = useState(false);
  return (
    <footer style={{ borderTop: '1px solid #E0E0DE', padding: '40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', background: '#FFFFFF' }}>
      <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
        {logoFailed ? (
          <span style={{ fontWeight: 800, fontSize: '16px', letterSpacing: '-0.02em', color: '#8C00B4' }}>LINUP</span>
        ) : (
          <img src="/logo.png" alt="LINUP" style={{ height: '32px', width: 'auto', display: 'block', maxWidth: '140px' }} onError={() => setLogoFailed(true)} />
        )}
      </Link>
      <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
        {[{ label: 'Pricing', href: '/pricing' }, { label: 'About', href: '/about' }, { label: 'Sign in', href: '/login' }].map(({ label, href }) => (
          <Link key={label} to={href} style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: '#8A8A82', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#1A1A18')}
            onMouseLeave={e => (e.currentTarget.style.color = '#8A8A82')}
          >{label}</Link>
        ))}
      </div>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: '#8A8A82' }}>© 2026 LINUP · linup.io</span>
    </footer>
  );
}
