// Doc 5 Screen 1 How It Works — three column explainer

const STEPS = [
  {
    number: '01',
    heading: 'Your idea enters',
    body: 'A 13-member Council validates your idea, challenges assumptions, and sets the exact scope your team will work from. No wasted effort on the wrong thing.',
  },
  {
    number: '02',
    heading: 'Your team works',
    body: 'Your AI engineering department builds the complete specification stage by stage. Named specialists with defined roles — you see exactly who is working on what.',
  },
  {
    number: '03',
    heading: 'You get the blueprint',
    body: 'Download the complete App Package and hand it to any developer. They can start building immediately — no discovery phase, no ambiguity, no rewrites.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" style={{
      padding: '100px 40px',
      background: 'var(--color-dark-0)',
      borderTop: '1px solid rgba(255,255,255,0.04)',
    }}>
      <p style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--color-surface-3)',
        textAlign: 'center',
        marginBottom: '16px',
      }}>
        HOW IT WORKS
      </p>
      <h2 style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 'clamp(28px, 4vw, 42px)',
        fontWeight: 700,
        letterSpacing: '-0.025em',
        color: 'var(--color-surface-0)',
        textAlign: 'center',
        margin: '0 auto 64px',
        maxWidth: '560px',
        lineHeight: 1.2,
      }}>
        From idea to developer-ready in one session.
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '32px',
        maxWidth: '960px',
        margin: '0 auto',
      }}>
        {STEPS.map(step => (
          <div key={step.number} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              fontWeight: 600,
              color: '#8C00B4',
              letterSpacing: '0.1em',
            }}>
              {step.number}
            </span>
            <h3 style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--color-surface-0)',
              margin: 0,
              letterSpacing: '-0.01em',
            }}>
              {step.heading}
            </h3>
            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '15px',
              lineHeight: 1.65,
              color: 'var(--color-surface-2)',
              margin: 0,
            }}>
              {step.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}