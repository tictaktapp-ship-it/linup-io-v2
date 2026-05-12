import { useState } from 'react';

const STAGES = [
  { id: 'p0',  label: 'Phase 0',   title: 'Idea Validation',   desc: '13 specialist Council members review your idea, validate the market, and set the scope before any work begins.' },
  { id: 'p05', label: 'Phase 0.5', title: 'Feature Discovery', desc: 'Five members define your MVP feature set and produce an approved Feature Charter your team works from.' },
  { id: 's1',  label: 'Stage 1',   title: 'Product Spec',      desc: 'Your product requirements are defined in full — user stories, acceptance criteria, and scope boundaries.' },
  { id: 's2',  label: 'Stage 2',   title: 'Architecture',      desc: 'System architecture, tech stack decisions, and all Architecture Decision Records produced.' },
  { id: 's3',  label: 'Stage 3',   title: 'Data Architecture', desc: 'Complete database schema, entity relationships, data retention policy, and migration strategy.' },
  { id: 's4',  label: 'Stage 4',   title: 'Backend & API',     desc: 'Full API register, endpoint contracts, authentication design, and server-side logic specification.' },
  { id: 's5',  label: 'Stage 5',   title: 'Frontend & Client', desc: 'Every screen specified with layout, components, states, and interaction patterns.' },
  { id: 's6',  label: 'Stage 6',   title: 'QA & Testing',      desc: 'Test strategy, test cases, coverage requirements, and acceptance criteria for every feature.' },
  { id: 's7',  label: 'Stage 7',   title: 'Security',          desc: 'Threat model, security requirements, auth hardening, and compliance checklist.' },
  { id: 's8',  label: 'Stage 8',   title: 'Infrastructure',    desc: 'Hosting architecture, environment setup, CI/CD pipeline, and scaling strategy.' },
  { id: 's9',  label: 'Stage 9',   title: 'Performance',       desc: 'Performance budgets, caching strategy, bottleneck identification, and monitoring plan.' },
  { id: 's10', label: 'Stage 10',  title: 'Deployment',        desc: 'Launch checklist, rollout strategy, rollback plan, and post-launch monitoring setup.' },
  { id: 's11', label: 'Stage 11',  title: 'Handover',          desc: 'Complete developer briefing document, RTM, and App Package ZIP ready to hand to any developer.' },
];

export function PipelinePreview() {
  const [active, setActive] = useState('p0');
  const activeStage = STAGES.find(s => s.id === active)!;
  return (
    <section id="features" style={{ padding: '100px 40px', background: '#F9FAFB', borderTop: '1px solid #E0E0DE' }}>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8A8A82', textAlign: 'center', marginBottom: '48px' }}>
        YOUR PRODUCT GOES THROUGH 13 STAGES
      </p>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '900px', margin: '0 auto 40px' }}>
        {STAGES.map(stage => {
          const isActive = stage.id === active;
          return (
            <button key={stage.id} onClick={() => setActive(stage.id)} style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: isActive ? 600 : 400, padding: '7px 16px', borderRadius: '100px', border: isActive ? '1px solid #8C00B4' : '1px solid #E0E0DE', background: isActive ? 'rgba(140,0,180,0.08)' : '#FFFFFF', color: isActive ? '#8C00B4' : '#4A4A46', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
              {stage.label}
            </button>
          );
        })}
      </div>
      <div style={{ maxWidth: '560px', margin: '0 auto', textAlign: 'center', minHeight: '80px' }}>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 600, color: '#8C00B4', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{activeStage.title}</p>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '16px', lineHeight: 1.6, color: '#4A4A46', margin: 0 }}>{activeStage.desc}</p>
      </div>
    </section>
  );
}
