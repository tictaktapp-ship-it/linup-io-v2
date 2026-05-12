import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MarketingNav } from '../../components/marketing/MarketingNav';
import { MarketingFooter } from '../../components/marketing/MarketingFooter';

export function AboutPage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'About LINUP';
    const setMeta = (sel: string, attr: string, val: string, content: string) => {
      let el = document.querySelector(sel);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, val); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('meta[name="description"]', 'name', 'description', 'LINUP is an AI engineering department for non-technical founders. Built in London.');
    setMeta('meta[name="robots"]', 'name', 'robots', 'index, follow');
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.setAttribute('rel', 'canonical'); document.head.appendChild(canonical); }
    canonical.setAttribute('href', 'https://linup.io/about');
  }, []);

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <MarketingNav />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 40px 80px', textAlign: 'center', maxWidth: '640px', margin: '0 auto', width: '100%' }}>
        <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, letterSpacing: '-0.03em', color: '#1A1A18', margin: '0 0 24px', lineHeight: 1.1 }}>
          About LINUP
        </h1>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '17px', lineHeight: 1.7, color: '#4A4A46', margin: '0 0 16px' }}>
          LINUP is an AI engineering department for non-technical founders.
        </p>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '17px', lineHeight: 1.7, color: '#4A4A46', margin: '0 0 40px' }}>
          We help you specify your product completely before a line of code is written. Built in London. © 2026 LINUP.
        </p>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', color: '#8A8A82', margin: '0 0 32px' }}>
          Get in touch:{' '}
          <a href="mailto:hello@linup.io" style={{ color: '#8C00B4', textDecoration: 'none' }}>hello@linup.io</a>
        </p>
        <button onClick={() => navigate('/signup')} style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 600, background: '#8C00B4', color: '#fff', border: 'none', borderRadius: '7px', padding: '12px 24px', cursor: 'pointer' }}>
          Start for free →
        </button>
      </main>
      <MarketingFooter />
    </div>
  );
}
