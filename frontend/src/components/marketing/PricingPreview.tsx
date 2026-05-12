import { useNavigate } from 'react-router-dom';

export function PricingPreview() {
  const navigate = useNavigate();
  return (
    <section style={{ padding: '100px 40px', background: '#F9FAFB', borderTop: '1px solid #E0E0DE' }}>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8A8A82', textAlign: 'center', marginBottom: '16px' }}>PRICING</p>
      <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, letterSpacing: '-0.025em', color: '#1A1A18', textAlign: 'center', margin: '0 auto 56px', maxWidth: '480px', lineHeight: 1.2 }}>
        Simple, honest pricing.
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', maxWidth: '680px', margin: '0 auto 40px' }}>
        <div style={{ border: '1px solid #E0E0DE', borderRadius: '12px', padding: '32px', background: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600, color: '#4A4A46', margin: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>FREE</p>
          <div>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '36px', fontWeight: 800, color: '#1A1A18', letterSpacing: '-0.03em' }}>£0</span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: '#8A8A82', marginLeft: '6px' }}>forever</span>
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {['1 project, free', 'Full specification PDF', 'Login + 2FA required', 'App Package: £199'].map(item => (
              <li key={item} style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: '#4A4A46', display: 'flex', gap: '8px' }}>
                <span style={{ color: '#8C00B4' }}>✓</span> {item}
              </li>
            ))}
          </ul>
          <button onClick={() => navigate('/signup')} style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600, background: 'transparent', color: '#1A1A18', border: '1px solid #E0E0DE', borderRadius: '7px', padding: '11px 20px', cursor: 'pointer', marginTop: 'auto' }}>
            Start for free →
          </button>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: '#8A8A82', margin: 0, textAlign: 'center' }}>No card required</p>
        </div>

        <div style={{ border: '1px solid rgba(140,0,180,0.4)', borderRadius: '12px', padding: '32px', background: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', boxShadow: '0 4px 16px rgba(140,0,180,0.08)' }}>
          <span style={{ position: 'absolute', top: '16px', right: '16px', fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 600, color: '#8C00B4', background: 'rgba(140,0,180,0.08)', border: '1px solid rgba(140,0,180,0.25)', borderRadius: '100px', padding: '3px 10px' }}>★ PRO</span>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600, color: '#8C00B4', margin: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>PRO</p>
          <div>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '36px', fontWeight: 800, color: '#1A1A18', letterSpacing: '-0.03em' }}>£149</span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: '#8A8A82', marginLeft: '6px' }}>/month</span>
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {['Unlimited projects', 'Priority processing', 'All downloads included', 'App Package included'].map(item => (
              <li key={item} style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: '#4A4A46', display: 'flex', gap: '8px' }}>
                <span style={{ color: '#8C00B4' }}>✓</span> {item}
              </li>
            ))}
          </ul>
          <button onClick={() => navigate('/signup?plan=pro')} style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600, background: '#8C00B4', color: '#fff', border: 'none', borderRadius: '7px', padding: '11px 20px', cursor: 'pointer', marginTop: 'auto' }}>
            Subscribe to Pro →
          </button>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: '#8A8A82', margin: 0, textAlign: 'center' }}>Cancel any time</p>
        </div>
      </div>
      <p style={{ textAlign: 'center', margin: 0 }}>
        <button onClick={() => navigate('/pricing')} style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: '#8A8A82', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}>See full pricing details →</button>
      </p>
    </section>
  );
}
