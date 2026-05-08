import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MarketingNav } from '../../components/marketing/MarketingNav';
import { MarketingFooter } from '../../components/marketing/MarketingFooter';

// Doc 5 Screen 9 — About (/about)
// Placeholder page at launch. Minimal, SEO-indexed.
// SEO: title = "About LINUP", meta description = "LINUP is an AI engineering department for non-technical founders. Built in London."

export function AboutPage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'About LINUP';

    let desc = document.querySelector('meta[name="description"]');
    if (!desc) { desc = document.createElement('meta'); desc.setAttribute('name', 'description'); document.head.appendChild(desc); }
    desc.setAttribute('content', 'LINUP is an AI engineering department for non-technical founders. Built in London.');

    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) { robots = document.createElement('meta'); robots.setAttribute('name', 'robots'); document.head.appendChild(robots); }
    robots.setAttribute('content', 'index, follow');

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.setAttribute('rel', 'canonical'); document.head.appendChild(canonical); }
    canonical.setAttribute('href', 'https://linup.io/about');
  }, []);

  return (
    <div style={{ background: 'var(--color-dark-0)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <MarketingNav />
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '120px 40px 80px',
        textAlign: 'center',
        maxWidth: '640px',
        margin: '0 auto',
        width: '100%',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 'clamp(32px, 5vw, 52px)',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          color: 'var(--color-surface-0)',
          margin: '0 0 24px',
          lineHeight: 1.1,
        }}>
          About LINUP
        </h1>

        <p style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '17px',
          lineHeight: 1.7,
          color: 'var(--color-surface-2)',
          margin: '0 0 16px',
        }}>
          LINUP is an AI engineering department for non-technical founders.
        </p>

        <p style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '17px',
          lineHeight: 1.7,
          color: 'var(--color-surface-2)',
          margin: '0 0 40px',
        }}>
          We help you specify your product completely before a line of code is written.
          Built in London. © 2026 LINUP.
        </p>

        <p style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '15px',
          color: 'var(--color-surface-3)',
          margin: '0 0 32px',
        }}>
          Get in touch:{' '}
          <a href="mailto:hello@linup.io" style={{
            color: '#C44DFF',
            textDecoration: 'none',
          }}>
            hello@linup.io
          </a>
        </p>

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
      </main>
      <MarketingFooter />
    </div>
  );
}