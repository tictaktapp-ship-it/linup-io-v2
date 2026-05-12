import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MarketingNav } from '../../components/marketing/MarketingNav';
import { MarketingFooter } from '../../components/marketing/MarketingFooter';

const FAQS = [
  {
    "q": "Do I need a credit card to start?",
    "a": "No. Your first project is completely free. No card required until you want to download the App Package or start a second project."
  },
  {
    "q": "What happens after my first project?",
    "a": "You keep full access to your first project's outputs. To start a second project, you can either subscribe to Pro (unlimited projects, all downloads included) or pay £10 per artifact as you go."
  },
  {
    "q": "What is an “artifact”?",
    "a": "Any individual downloadable item from your project — the spec PDF, API register, database schema, developer brief, and so on. The App Package ZIP counts as one artifact at £199 for your first project, or £10 per artifact on subsequent free-tier projects."
  },
  {
    "q": "Can I cancel Pro at any time?",
    "a": "Yes. Cancel from your billing settings at any time. You keep access until the end of your current billing period. No penalties."
  },
  {
    "q": "What is the App Package?",
    "a": "A ZIP file containing everything a developer needs to build your app immediately — full spec PDF, API register, database schema, ADRs, developer brief, acceptance criteria, testing strategy, RTM, and a launch guide."
  },
  {
    "q": "Is my project data private?",
    "a": "Yes. Your project data is isolated to your account. LINUP staff cannot read your project content. Your prompts and outputs are never used to train AI models."
  },
  {
    "q": "Will there be more plans?",
    "a": "Yes — Starter, Team, and Enterprise plans are planned. Existing Pro subscribers won't be forced onto a higher-priced plan."
  }
];

const DOWNLOAD_ROWS = [
  {
    "item": "Specification PDF",
    "free1": "✓ Free",
    "free2": "£10 per artifact",
    "pro": "✓ Included"
  },
  {
    "item": "API Register (JSON)",
    "free1": "✓ Free",
    "free2": "£10 per artifact",
    "pro": "✓ Included"
  },
  {
    "item": "Database Schema (SQL)",
    "free1": "✓ Free",
    "free2": "£10 per artifact",
    "pro": "✓ Included"
  },
  {
    "item": "Architecture ADRs",
    "free1": "✓ Free",
    "free2": "£10 per artifact",
    "pro": "✓ Included"
  },
  {
    "item": "Developer Brief",
    "free1": "✓ Free",
    "free2": "£10 per artifact",
    "pro": "✓ Included"
  },
  {
    "item": "App Package ZIP",
    "free1": "£199 one-off",
    "free2": "£10 per artifact",
    "pro": "✓ Included"
  }
];

export function PricingPage() {
  const navigate = useNavigate();
  const [annual, setAnnual] = useState(false);

  useEffect(() => {
    document.title = 'LINUP Pricing — Free & Pro Plans';
    const setMeta = (sel: string, attr: string, val: string, content: string) => {
      let el = document.querySelector(sel);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, val); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('meta[name="description"]', 'name', 'description', 'Start free with your first app. No card required. Upgrade to Pro for unlimited projects and all downloads.');
    setMeta('meta[name="robots"]', 'name', 'robots', 'index, follow');
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.setAttribute('rel', 'canonical'); document.head.appendChild(canonical); }
    canonical.setAttribute('href', 'https://linup.io/pricing');
  }, []);

  const proSub = annual ? '2 months free' : 'Cancel any time';
  const proCta = annual ? 'Subscribe annually →' : 'Subscribe to Pro →';
  const proPrice = annual ? '£1,490' : '£149';
  const proPer = annual ? '/ year' : '/ month';

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh' }}>
      <MarketingNav />
      <main style={{ paddingTop: '60px' }}>

        <section style={{ padding: '80px 40px 48px', textAlign: 'center', background: '#FFFFFF' }}>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 800, letterSpacing: '-0.03em', color: '#1A1A18', margin: '0 0 16px', lineHeight: 1.1 }}>
            Simple, honest pricing
          </h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '17px', color: '#4A4A46', margin: '0 auto', maxWidth: '440px', lineHeight: 1.6 }}>
            One free project to get started. No card required. Upgrade when you're ready.
          </p>
        </section>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '48px' }}>
          {(['Monthly', 'Annual — save 2 months'] as const).map((label, i) => {
            const isAnnual = i === 1;
            const active = annual === isAnnual;
            return (
              <button key={label} onClick={() => setAnnual(isAnnual)} style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: active ? 600 : 400, padding: '8px 20px', borderRadius: '100px', border: active ? '1px solid #8C00B4' : '1px solid #E0E0DE', background: active ? 'rgba(140,0,180,0.08)' : '#FFFFFF', color: active ? '#8C00B4' : '#4A4A46', cursor: 'pointer', transition: 'all 0.15s' }}>
                {label}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', maxWidth: '720px', margin: '0 auto 80px', padding: '0 40px' }}>
          <div style={{ border: '1px solid #E0E0DE', borderRadius: '14px', padding: '36px', background: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600, color: '#4A4A46', margin: 0, letterSpacing: '0.08em', textTransform: 'uppercase' }}>FREE</p>
            <div>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '40px', fontWeight: 800, color: '#1A1A18', letterSpacing: '-0.03em' }}>£0</span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: '#8A8A82', marginLeft: '8px' }}>forever</span>
            </div>
            <button onClick={() => navigate('/signup')} style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600, background: 'transparent', color: '#1A1A18', border: '1px solid #E0E0DE', borderRadius: '7px', padding: '12px', cursor: 'pointer' }}>
              Start for free →
            </button>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: '#8A8A82', margin: 0, textAlign: 'center' }}>No card required</p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {['1 project, free', 'Full spec PDF', 'Login + 2FA required', 'App Package: £199', '2nd project+: £10/artifact'].map(f => (
                <li key={f} style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: '#4A4A46', display: 'flex', gap: '8px' }}>
                  <span style={{ color: '#8C00B4' }}>✓</span>{f}
                </li>
              ))}
            </ul>
          </div>

          <div style={{ border: '1px solid rgba(140,0,180,0.4)', borderRadius: '14px', padding: '36px', background: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', boxShadow: '0 4px 20px rgba(140,0,180,0.10)' }}>
            <span style={{ position: 'absolute', top: '16px', right: '16px', fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 600, color: '#8C00B4', background: 'rgba(140,0,180,0.08)', border: '1px solid rgba(140,0,180,0.25)', borderRadius: '100px', padding: '3px 10px' }}>★ PRO</span>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600, color: '#8C00B4', margin: 0, letterSpacing: '0.08em', textTransform: 'uppercase' }}>PRO</p>
            <div>
              {annual && <span style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', color: '#8A8A82', textDecoration: 'line-through', display: 'block', marginBottom: '4px' }}>£149/mo</span>}
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '40px', fontWeight: 800, color: '#1A1A18', letterSpacing: '-0.03em' }}>{proPrice}</span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: '#8A8A82', marginLeft: '8px' }}>{proPer}</span>
              {annual && <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: '#8C00B4', display: 'block', marginTop: '4px' }}>2 months free</span>}
            </div>
            <button onClick={() => navigate('/signup?plan=pro')} style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600, background: '#8C00B4', color: '#fff', border: 'none', borderRadius: '7px', padding: '12px', cursor: 'pointer' }}>
              {proCta}
            </button>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: '#8A8A82', margin: 0, textAlign: 'center' }}>{proSub}</p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {['Unlimited projects', 'Priority processing', 'All downloads included', 'App Package included', 'Cancel any time'].map(f => (
                <li key={f} style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: '#4A4A46', display: 'flex', gap: '8px' }}>
                  <span style={{ color: '#8C00B4' }}>✓</span>{f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <section style={{ padding: '0 40px 80px', maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '22px', fontWeight: 700, color: '#1A1A18', marginBottom: '24px', letterSpacing: '-0.02em' }}>What's included</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #E0E0DE', borderRadius: '10px', overflow: 'hidden' }}>
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  {['Download', 'Free (project 1)', 'Free (project 2+)', 'Pro'].map((h, i) => (
                    <th key={h} style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 600, color: i === 3 ? '#8C00B4' : '#4A4A46', padding: '14px 16px', textAlign: i === 0 ? 'left' as const : 'center' as const, letterSpacing: '0.06em', textTransform: 'uppercase' as const, borderBottom: '1px solid #E0E0DE' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DOWNLOAD_ROWS.map((row, idx) => (
                  <tr key={row.item} style={{ background: idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}>
                    <td style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', padding: '14px 16px', color: '#1A1A18', fontWeight: 500, borderBottom: '1px solid #E0E0DE', textAlign: 'left' }}>{row.item}</td>
                    <td style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', padding: '14px 16px', color: '#4A4A46', borderBottom: '1px solid #E0E0DE', textAlign: 'center' }}>{row.free1}</td>
                    <td style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', padding: '14px 16px', color: '#4A4A46', borderBottom: '1px solid #E0E0DE', textAlign: 'center' }}>{row.free2}</td>
                    <td style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', padding: '14px 16px', color: '#8C00B4', fontWeight: 600, borderBottom: '1px solid #E0E0DE', textAlign: 'center' }}>{row.pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: '#8A8A82', marginTop: '16px', lineHeight: 1.6 }}>
            Artifact = any individual downloadable item. Upgrade to Pro at any time to unlock all downloads immediately.
          </p>
        </section>

        <section style={{ padding: '48px 40px', borderTop: '1px solid #E0E0DE', borderBottom: '1px solid #E0E0DE', background: '#F9FAFB' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '48px', flexWrap: 'wrap' }}>
            {[{ icon: '🔒', text: 'Your IP is protected' }, { icon: '💻', text: 'Works in your browser' }, { icon: '☑', text: 'No surprise charges' }].map(s => (
              <div key={s.text} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px' }}>{s.icon}</span>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 500, color: '#4A4A46' }}>{s.text}</span>
              </div>
            ))}
          </div>
        </section>

        <section style={{ padding: '80px 40px', maxWidth: '720px', margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '22px', fontWeight: 700, color: '#1A1A18', marginBottom: '32px', letterSpacing: '-0.02em' }}>Frequently asked questions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {FAQS.map(faq => (
              <details key={faq.q} style={{ borderBottom: '1px solid #E0E0DE', paddingBottom: '2px' }}>
                <summary style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 500, color: '#1A1A18', padding: '16px 0', cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {faq.q}
                  <span style={{ color: '#8A8A82', fontSize: '18px', fontWeight: 300 }}>+</span>
                </summary>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', lineHeight: 1.7, color: '#4A4A46', margin: '0 0 16px', paddingRight: '24px' }}>{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section style={{ padding: '0 40px 64px', maxWidth: '720px', margin: '0 auto' }}>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: '#8A8A82', lineHeight: 1.7, borderTop: '1px solid #E0E0DE', paddingTop: '24px' }}>
            Downloads and AI processing are non-refundable once delivered or used. Subscriptions are refundable only for periods where LINUP was not used at all, within 30 days of the charge.
          </p>
        </section>

        <section style={{ padding: '64px 40px 80px', textAlign: 'center', borderTop: '1px solid #E0E0DE', background: '#F9FAFB' }}>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '20px', fontWeight: 700, color: '#1A1A18', margin: '0 0 24px', letterSpacing: '-0.02em' }}>Ready to start?</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
            <button onClick={() => navigate('/signup')} style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 600, background: 'transparent', color: '#1A1A18', border: '1px solid #E0E0DE', borderRadius: '7px', padding: '12px 24px', cursor: 'pointer' }}>Start for free →</button>
            <button onClick={() => navigate('/signup?plan=pro')} style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 600, background: '#8C00B4', color: '#fff', border: 'none', borderRadius: '7px', padding: '12px 24px', cursor: 'pointer' }}>Subscribe to Pro →</button>
          </div>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: '#8A8A82', margin: 0 }}>No card required for free tier.</p>
        </section>

      </main>
      <MarketingFooter />
    </div>
  );
}
