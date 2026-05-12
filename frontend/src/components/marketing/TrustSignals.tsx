const SIGNALS = [
  { icon: '🔒', heading: 'Your IP is protected',             body: 'All AI processing happens server-side. Your prompts and outputs never leave our servers and are never used to train AI models.' },
  { icon: '🗄️', heading: 'Your data is isolated',      body: 'Your project data is isolated to your account. No other user — or LINUP staff — can read your project content.' },
  { icon: '👁️', heading: "You always understand what's happening", body: 'Named specialists, live progress, and plain-language summaries at every stage. No black box.' },
];

export function TrustSignals() {
  return (
    <section style={{ padding: '80px 40px', background: '#FFFFFF', borderTop: '1px solid #E0E0DE' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', maxWidth: '960px', margin: '0 auto' }}>
        {SIGNALS.map(s => (
          <div key={s.heading} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '28px', background: '#F9FAFB', border: '1px solid #E0E0DE', borderRadius: '10px' }}>
            <span style={{ fontSize: '24px' }}>{s.icon}</span>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 600, color: '#1A1A18', margin: 0 }}>{s.heading}</p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', lineHeight: 1.6, color: '#4A4A46', margin: 0 }}>{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
