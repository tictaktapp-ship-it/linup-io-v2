const STEPS = [
  { number: '01', heading: 'Your idea enters',    body: 'A 13-member Council validates your idea, challenges assumptions, and sets the exact scope your team will work from. No wasted effort on the wrong thing.' },
  { number: '02', heading: 'Your team works',     body: 'Your AI engineering department builds the complete specification stage by stage. Named specialists with defined roles — you see exactly who is working on what.' },
  { number: '03', heading: 'You get the blueprint', body: 'Download the complete App Package and hand it to any developer. They can start building immediately — no discovery phase, no ambiguity, no rewrites.' },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" style={{ padding: '100px 40px', background: '#F9FAFB', borderTop: '1px solid #E0E0DE' }}>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8A8A82', textAlign: 'center', marginBottom: '16px' }}>HOW IT WORKS</p>
      <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, letterSpacing: '-0.025em', color: '#1A1A18', textAlign: 'center', margin: '0 auto 64px', maxWidth: '560px', lineHeight: 1.2 }}>
        From idea to developer-ready in one session.
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '48px', maxWidth: '960px', margin: '0 auto' }}>
        {STEPS.map(step => (
          <div key={step.number} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: '#8C00B4', letterSpacing: '0.1em' }}>{step.number}</span>
            <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '20px', fontWeight: 700, color: '#1A1A18', margin: 0, letterSpacing: '-0.01em' }}>{step.heading}</h3>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', lineHeight: 1.65, color: '#4A4A46', margin: 0 }}>{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
