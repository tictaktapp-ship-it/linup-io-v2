import { useNavigate } from 'react-router-dom';

export function HeroSection() {
  const navigate = useNavigate();
  return (
    <section style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', textAlign: 'center',
      padding: '120px 40px 80px', background: '#FFFFFF',
    }}>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8C00B4', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ color: '#8C00B4' }}>•</span> THE AI ENGINE FOR NON-TECHNICAL FOUNDERS
      </p>

      <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-0.03em', margin: '0 0 24px', maxWidth: '780px', color: '#1A1A18' }}>
        Build the right thing<br />from the start.
      </h1>

      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '18px', fontWeight: 400, lineHeight: 1.6, color: '#4A4A46', maxWidth: '520px', margin: '0 0 40px' }}>
        LINUP runs a full-stack AI engineering department that specifies your product before a line of code is written.
      </p>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={() => navigate('/signup')} style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 600, background: '#8C00B4', color: '#fff', border: 'none', borderRadius: '7px', padding: '13px 28px', cursor: 'pointer' }}>
          Start for free →
        </button>
        <a href="#how-it-works" style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 500, color: '#4A4A46', textDecoration: 'none', padding: '13px 24px', border: '1px solid #E0E0DE', borderRadius: '7px', display: 'inline-block' }}>
          See how it works
        </a>
      </div>

      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: '#8A8A82', margin: 0 }}>
        ✓ Free first project · No card required · Login required
      </p>
    </section>
  );
}
