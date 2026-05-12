import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setAuthed(localStorage.getItem('linup_authed') === '1');
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      height: '60px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', padding: '0 40px',
      background: scrolled ? 'rgba(255,255,255,0.95)' : '#FFFFFF',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      borderBottom: '1px solid #E0E0DE',
      transition: 'background 0.2s ease',
    }}>
      <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
        {logoFailed ? (
          <span style={{ fontWeight: 800, fontSize: '20px', letterSpacing: '-0.02em', color: '#8C00B4' }}>LINUP</span>
        ) : (
          <img src="/logo.png" alt="LINUP" style={{ height: '32px', width: 'auto', display: 'block' }} onError={() => setLogoFailed(true)} />
        )}
      </Link>

      <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
        {[{ label: 'Features', href: '/#features' }, { label: 'Pricing', href: '/pricing' }, { label: 'About', href: '/about' }].map(({ label, href }) => (
          <Link key={label} to={href} style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 500, color: '#4A4A46', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#1A1A18')}
            onMouseLeave={e => (e.currentTarget.style.color = '#4A4A46')}
          >{label}</Link>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        {authed ? (
          <button onClick={() => navigate('/app')} style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600, background: '#8C00B4', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 18px', cursor: 'pointer' }}>
            Go to app →
          </button>
        ) : (
          <>
            <button onClick={() => navigate('/login')} style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 500, background: 'transparent', color: '#4A4A46', border: '1px solid #E0E0DE', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer' }}>
              Sign in
            </button>
            <button onClick={() => navigate('/signup')} style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600, background: '#8C00B4', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 18px', cursor: 'pointer' }}>
              Start free →
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
