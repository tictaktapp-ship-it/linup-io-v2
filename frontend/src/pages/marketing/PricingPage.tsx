import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MarketingNav } from '../../components/marketing/MarketingNav';
import { MarketingFooter } from '../../components/marketing/MarketingFooter';

// Doc 5 Screen 18 — Pricing (/pricing)
// Billing toggle (monthly/annual), plan cards, download table, trust strip, FAQ, refund, bottom CTA

const FAQS = [
  { q: 'Do I need a credit card to start?', a: 'No. Your first project is completely free. No card required until you want to download the App Package or start a second project.' },
  { q: 'What happens after my first project?', a: 'You keep full access to your first project\'s outputs. To start a second project, you can either subscribe to Pro (unlimited projects, all downloads included) or pay £10 per artifact as you go.' },
  { q: 'What is an \u201cartifact\u201d?', a: 'Any individual downloadable item from your project \u2014 the spec PDF, API register, database schema, developer brief, and so on. The App Package ZIP counts as one artifact at £199 for your first project, or £10 per artifact on subsequent free-tier projects.' },
  { q: 'Can I cancel Pro at any time?', a: 'Yes. Cancel from your billing settings at any time. You keep access until the end of your current billing period. No penalties.' },
  { q: 'What is the App Package?', a: 'A ZIP file containing everything a developer needs to build your app immediately \u2014 full spec PDF, API register, database schema, ADRs, developer brief, acceptance criteria, testing strategy, RTM, and a launch guide.' },
  { q: 'What is the MEC (revenue share)?', a: 'If your app processes payments using the LINUP-generated Stripe integration, LINUP takes a 1.5% application fee on each transaction, applied automatically at the Stripe level. This is fully disclosed before you download your App Package, and requires your explicit acknowledgement.' },
  { q: 'Is my project data private?', a: 'Yes. Your project data is isolated to your account. LINUP staff cannot read your project content. Your prompts and outputs are never used to train AI models.' },
  { q: 'Will there be more plans?', a: 'Yes \u2014 Starter, Team, and Enterprise plans are planned. They\'ll be announced when ready. Existing Pro subscribers won\'t be forced onto a higher-priced plan.' },
];

const DOWNLOAD_ROWS = [
  { item: 'Specification PDF',     free1: '✓ Free', free2: '£10 per artifact', pro: '✓ Included' },
  { item: 'API Register (JSON)',   free1: '✓ Free', free2: '£10 per artifact', pro: '✓ Included' },
  { item: 'Database Schema (SQL)', free1: '✓ Free', free2: '£10 per artifact', pro: '✓ Included' },
  { item: 'Architecture ADRs',     free1: '✓ Free', free2: '£10 per artifact', pro: '✓ Included' },
  { item: 'Developer Brief',       free1: '✓ Free', free2: '£10 per artifact', pro: '✓ Included' },
  { item: 'Acceptance Criteria',   free1: '✓ Free', free2: '£10 per artifact', pro: '✓ Included' },
  { item: 'Testing Strategy',      free1: '✓ Free', free2: '£10 per artifact', pro: '✓ Included' },
  { item: 'RTM',                   free1: '✓ Free', free2: '£10 per artifact', pro: '✓ Included' },
  { item: 'App Package ZIP',       free1: '£199 one-off', free2: '£10 per artifact', pro: '✓ Included' },
  { item: 'Launch Guide',          free1: '✓ Free', free2: '£10 per artifact', pro: '✓ Included' },
];

const cellStyle = (highlight?: boolean): React.CSSProperties => ({
  fontFamily: 'var(--font-sans)',
  fontSize: '14px',
  padding: '14px 16px',
  color: highlight ? '#C44DFF' : 'var(--color-surface-2)',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
  textAlign: 'center',
});

export function PricingPage() {
  const navigate = useNavigate();
  const [annual, setAnnual] = useState(false);

  useEffect(() => {
    document.title = 'LINUP Pricing \u2014 Free & Pro Plans';

    let desc = document.querySelector('meta[name="description"]');
    if (!desc) { desc = document.createElement('meta'); desc.setAttribute('name', 'description'); document.head.appendChild(desc); }
    desc.setAttribute('content', 'Start free with your first app. Upgrade to Pro for unlimited projects, priority processing, and all downloads included. No credits, no surprises.');

    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) { ogTitle = document.createElement('meta'); ogTitle.setAttribute('property', 'og:title'); document.head.appendChild(ogTitle); }
    ogTitle.setAttribute('content', 'LINUP \u2014 Simple, honest pricing');

    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (!ogDesc) { ogDesc = document.createElement('meta'); ogDesc.setAttribute('property', 'og:description'); document.head.appendChild(ogDesc); }
    ogDesc.setAttribute('content', 'One free project. Pro at £149/month. Your AI engineering department is ready.');

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.setAttribute('rel', 'canonical'); document.head.appendChild(canonical); }
    canonical.setAttribute('href', 'https://linup.io/pricing');

    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) { robots = document.createElement('meta'); robots.setAttribute('name', 'robots'); document.head.appendChild(robots); }
    robots.setAttribute('content', 'index, follow');
  }, []);

  const proSub   = annual ? '2 months free' : 'Cancel any time';
  const proCta   = annual ? 'Subscribe annually \u2192' : 'Subscribe to Pro \u2192';

  return (
    <div style={{ background: 'var(--color-dark-0)', minHeight: '100vh' }}>
      <MarketingNav />
      <main style={{ paddingTop: '60px' }}>

        {/* Hero */}
        <section style={{ padding: '80px 40px 48px', textAlign: 'center' }}>
          <h1 style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'clamp(32px, 5vw, 56px)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: 'var(--color-surface-0)',
            margin: '0 0 16px',
            lineHeight: 1.1,
          }}>
            Simple, honest pricing
          </h1>
          <p style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '17px',
            color: 'var(--color-surface-2)',
            margin: '0 auto',
            maxWidth: '440px',
            lineHeight: 1.6,
          }}>
            One free project to get started. No card required.
            Upgrade when you're ready.
          </p>
        </section>

        {/* Billing toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '48px' }}>
          {(['Monthly', 'Annual \u2014 save 2 months'] as const).map((label, i) => {
            const isAnnual = i === 1;
            const active = annual === isAnnual;
            return (
              <button key={label} onClick={() => setAnnual(isAnnual)} style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '14px',
                fontWeight: active ? 600 : 400,
                padding: '8px 20px',
                borderRadius: '100px',
                border: active ? '1px solid #8C00B4' : '1px solid rgba(255,255,255,0.1)',
                background: active ? 'rgba(140,0,180,0.15)' : 'transparent',
                color: active ? '#C44DFF' : 'var(--color-surface-3)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}>
                {label}
              </button>
            );
          })}
        </div>

        {/* Plan cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          maxWidth: '720px',
          margin: '0 auto 80px',
          padding: '0 40px',
        }}>
          {/* Free */}
          <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '36px', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600, color: 'var(--color-surface-2)', margin: 0, letterSpacing: '0.08em', textTransform: 'uppercase' }}>FREE</p>
            <div>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '40px', fontWeight: 800, color: 'var(--color-surface-0)', letterSpacing: '-0.03em' }}>£0</span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: 'var(--color-surface-3)', marginLeft: '8px' }}>forever</span>
            </div>
            <button onClick={() => navigate('/signup')} style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600, background: 'transparent', color: 'var(--color-surface-0)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '7px', padding: '12px', cursor: 'pointer' }}>
              Start for free \u2192
            </button>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--color-surface-3)', margin: 0, textAlign: 'center' }}>No card required</p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {['1 project, free', 'Full spec PDF', 'Login + 2FA required', 'App Package: £199', '2nd project+: £10/artifact'].map(f => (
                <li key={f} style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: 'var(--color-surface-2)', display: 'flex', gap: '8px' }}>
                  <span style={{ color: '#8C00B4' }}>✓</span>{f}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro — highlighted */}
          <div style={{ border: '1px solid rgba(140,0,180,0.5)', borderRadius: '14px', padding: '36px', background: 'rgba(140,0,180,0.06)', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
            <span style={{ position: 'absolute', top: '16px', right: '16px', fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 600, color: '#C44DFF', background: 'rgba(140,0,180,0.2)', border: '1px solid rgba(140,0,180,0.4)', borderRadius: '100px', padding: '3px 10px' }}>★ PRO</span>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600, color: '#C44DFF', margin: 0, letterSpacing: '0.08em', textTransform: 'uppercase' }}>PRO</p>
            <div>
              {annual && <span style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', color: 'var(--color-surface-3)', textDecoration: 'line-through', display: 'block', marginBottom: '4px' }}>£149/mo</span>}
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '40px', fontWeight: 800, color: 'var(--color-surface-0)', letterSpacing: '-0.03em' }}>{annual ? '£1,490' : '£149'}</span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: 'var(--color-surface-3)', marginLeft: '8px' }}>{annual ? '/ year' : '/ month'}</span>
              {annual && <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: '#C44DFF', display: 'block', marginTop: '4px' }}>2 months free</span>}
            </div>
            <button onClick={() => navigate('/signup?plan=pro')} style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600, background: '#8C00B4', color: '#fff', border: 'none', borderRadius: '7px', padding: '12px', cursor: 'pointer' }}>
              {proCta}
            </button>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--color-surface-3)', margin: 0, textAlign: 'center' }}>{proSub}</p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {['Unlimited projects', 'Priority processing', 'All downloads included', 'App Package included', 'Spec PDF included', 'Cancel any time'].map(f => (
                <li key={f} style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: 'var(--color-surface-1)', display: 'flex', gap: '8px' }}>
                  <span style={{ color: '#C44DFF' }}>✓</span>{f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Download table */}
        <section style={{ padding: '0 40px 80px', maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '22px', fontWeight: 700, color: 'var(--color-surface-0)', marginBottom: '24px', letterSpacing: '-0.02em' }}>What's included</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', overflow: 'hidden' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {['Download', 'Free (project 1)', 'Free (project 2+)', 'Pro'].map((h, i) => (
                    <th key={h} style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 600, color: i === 3 ? '#C44DFF' : 'var(--color-surface-3)', padding: '14px 16px', textAlign: i === 0 ? 'left' : 'center', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DOWNLOAD_ROWS.map((row, idx) => (
                  <tr key={row.item} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                    <td style={{ ...cellStyle(), textAlign: 'left', color: 'var(--color-surface-1)', fontWeight: 500 }}>{row.item}</td>
                    <td style={cellStyle()}>{row.free1}</td>
                    <td style={cellStyle()}>{row.free2}</td>
                    <td style={cellStyle(true)}>{row.pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--color-surface-3)', marginTop: '16px', lineHeight: 1.6 }}>
            • Artifact = any individual downloadable item. Upgrade to Pro at any time to unlock all downloads immediately.
          </p>
        </section>

        {/* Trust strip */}
        <section style={{ padding: '48px 40px', borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '48px', flexWrap: 'wrap' }}>
            {[
              { icon: '🔒', text: 'Your IP is protected' },
              { icon: '💻', text: 'Works in your browser' },
              { icon: '☑', text: 'No surprise charges' },
            ].map(s => (
              <div key={s.text} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px' }}>{s.icon}</span>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 500, color: 'var(--color-surface-2)' }}>{s.text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section style={{ padding: '80px 40px', maxWidth: '720px', margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '22px', fontWeight: 700, color: 'var(--color-surface-0)', marginBottom: '32px', letterSpacing: '-0.02em' }}>Frequently asked questions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {FAQS.map(faq => (
              <details key={faq.q} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '2px' }}>
                <summary style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '15px',
                  fontWeight: 500,
                  color: 'var(--color-surface-1)',
                  padding: '16px 0',
                  cursor: 'pointer',
                  listStyle: 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  {faq.q}
                  <span style={{ color: 'var(--color-surface-3)', fontSize: '18px', fontWeight: 300 }}>+</span>
                </summary>
                <p style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '14px',
                  lineHeight: 1.7,
                  color: 'var(--color-surface-2)',
                  margin: '0 0 16px',
                  paddingRight: '24px',
                }}>
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Refund policy */}
        <section style={{ padding: '0 40px 64px', maxWidth: '720px', margin: '0 auto' }}>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--color-surface-3)', lineHeight: 1.7, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px' }}>
            Downloads and AI processing are non-refundable once delivered or used.
            Subscriptions are refundable only for periods where LINUP was not used at all, within 30 days of the charge.
            Full policy in our Terms.
          </p>
        </section>

        {/* Bottom CTA strip */}
        <section style={{ padding: '64px 40px 80px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '20px', fontWeight: 700, color: 'var(--color-surface-0)', margin: '0 0 24px', letterSpacing: '-0.02em' }}>Ready to start?</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
            <button onClick={() => navigate('/signup')} style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 600, background: 'transparent', color: 'var(--color-surface-0)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '7px', padding: '12px 24px', cursor: 'pointer' }}>Start for free \u2192</button>
            <button onClick={() => navigate('/signup?plan=pro')} style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 600, background: '#8C00B4', color: '#fff', border: 'none', borderRadius: '7px', padding: '12px 24px', cursor: 'pointer' }}>Subscribe to Pro \u2192</button>
          </div>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--color-surface-3)', margin: 0 }}>No card required for free tier.</p>
        </section>

      </main>
      <MarketingFooter />
    </div>
  );
}