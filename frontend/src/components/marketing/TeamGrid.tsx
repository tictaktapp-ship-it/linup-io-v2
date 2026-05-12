import { useState } from 'react';

const MEMBERS = [
  { id: 'L-0-001',  role: 'Chief Product Officer',          tier: 'S', oneliner: 'Global context, spec integrity, user sign-off.',          detail: 'The CPO holds the entire product vision. Every stage output passes through CPO review before delivery to the founder.' },
  { id: 'L-0-002',  role: 'Inspector General',              tier: 'S', oneliner: 'Independent review before every founder delivery.',        detail: 'The IG independently reviews all stage outputs for contradictions, missed requirements, and alignment with the founder brief.' },
  { id: 'PM-0-001', role: 'Programme Manager',              tier: 'M', oneliner: 'Gate control and stage transitions.',                     detail: 'The PM controls the state machine — opening and closing stages, enforcing gates, and managing the pipeline sequence.' },
  { id: 'L-0-005',  role: 'Plain Language Translator',      tier: 'M', oneliner: 'Turns engineering outputs into founder-readable briefs.',  detail: 'Every founder-facing output passes through the PLT to ensure it is clear, jargon-free, and actionable.' },
  { id: 'L-1-001',  role: 'VP Product & UX',                tier: 'M', oneliner: 'Leads Stages 1 and 5.',                                   detail: 'Sequences and reviews all product and frontend specialists. Enforces acceptance criteria and UX consistency.' },
  { id: 'L-1-002',  role: 'VP Architecture & Backend',      tier: 'M', oneliner: 'Leads Stages 2, 4, and 8.',                               detail: 'Owns all architecture decisions, API contracts, and infrastructure specifications.' },
  { id: 'L-1-003',  role: 'VP Data, Security & Compliance', tier: 'M', oneliner: 'Leads Stages 3 and 7.',                                   detail: 'Owns the database schema, data retention policy, security threat model, and compliance checklist.' },
  { id: 'L-1-004',  role: 'VP Quality & Delivery',          tier: 'M', oneliner: 'Leads Stages 6, 9, 10, and 11.',                         detail: 'Owns test strategy, performance budgets, deployment plan, and final handover package.' },
  { id: 'S*-2-*',   role: 'Specialist Engineers',           tier: 'W', oneliner: 'Domain experts executing under strict I/O contracts.',    detail: 'Over 60 named specialist ICs across all 11 stages — each with a defined input, process, and output. No silent changes.' },
];

const TIER_COLOUR: Record<string, string> = { S: '#8C00B4', M: '#4F46E5', W: '#4A4A46' };

export function TeamGrid() {
  const [hovered, setHovered] = useState<string | null>(null);
  return (
    <section style={{ padding: '100px 40px', background: '#FFFFFF', borderTop: '1px solid #E0E0DE' }}>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8A8A82', textAlign: 'center', marginBottom: '16px' }}>
        YOUR AI ENGINEERING TEAM. ONE DIRECTION.
      </p>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '16px', color: '#4A4A46', textAlign: 'center', maxWidth: '480px', margin: '0 auto 56px', lineHeight: 1.6 }}>
        Every member has a defined role, strict I/O contracts, and no ability to silently change decisions.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px', maxWidth: '1100px', margin: '0 auto' }}>
        {MEMBERS.map(m => {
          const isHovered = hovered === m.id;
          return (
            <div key={m.id} onMouseEnter={() => setHovered(m.id)} onMouseLeave={() => setHovered(null)} style={{ background: isHovered ? 'rgba(140,0,180,0.04)' : '#FFFFFF', border: isHovered ? '1px solid rgba(140,0,180,0.3)' : '1px solid #E0E0DE', borderRadius: '10px', padding: '20px', cursor: 'default', transition: 'background 0.2s, border-color 0.2s', boxShadow: isHovered ? '0 4px 16px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 600, color: TIER_COLOUR[m.tier], background: '#F9FAFB', border: '1px solid #E0E0DE', borderRadius: '4px', padding: '2px 6px', letterSpacing: '0.04em' }}>{m.id}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: TIER_COLOUR[m.tier], letterSpacing: '0.06em' }}>TIER {m.tier}</span>
              </div>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600, color: '#1A1A18', margin: '0 0 6px', lineHeight: 1.3 }}>{m.role}</p>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: '#4A4A46', margin: 0, lineHeight: 1.5 }}>{isHovered ? m.detail : m.oneliner}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
