const fs = require('fs');
const filePath = 'E:\\Linup v2\\frontend\\src\\pages\\app\\CouncilPage.tsx';
let content = fs.readFileSync(filePath, 'utf8');
let ok = true;

function replace(label, from, to) {
  if (!content.includes(from)) { console.error('ERROR: ' + label); ok = false; return; }
  content = content.replace(from, to);
  console.log('OK: ' + label);
}

// 1. Add COUNCIL_MEMBER_PROFILES after PHASE05_MEMBER_ORDER constant
replace('after PHASE05_MEMBER_ORDER',
  `const API = (path: string) => (import.meta.env.VITE_API_URL as string) + '/api' + path;`,
  `const API = (path: string) => (import.meta.env.VITE_API_URL as string) + '/api' + path;

// Human profiles for each council member
const COUNCIL_MEMBER_PROFILES: Record<string, { name: string; role: string; initials: string; color: string }> = {
  'P0-2-001': { name: 'Marcus Webb',    role: 'Market Analyst',        initials: 'MW', color: '#0284C7' },
  'P0-2-002': { name: 'Priya Nair',     role: 'Customer Advocate',     initials: 'PN', color: '#7C3AED' },
  'P0-2-003': { name: 'Daniel Osei',    role: 'Competitive Analyst',   initials: 'DO', color: '#0891B2' },
  'P0-2-004': { name: 'Sarah Lindqvist',role: 'Business Strategist',   initials: 'SL', color: '#6D28D9' },
  'P0-2-005': { name: 'Tom Hargreaves', role: 'Technical Assessor',    initials: 'TH', color: '#1D4ED8' },
  'P0-2-006': { name: 'Aisha Kamara',   role: 'Security Reviewer',     initials: 'AK', color: '#DC2626' },
  'P0-2-007': { name: 'Lena Fischer',   role: 'Ethics Officer',        initials: 'LF', color: '#059669' },
  'P0-2-008': { name: 'James Okafor',   role: 'Financial Analyst',     initials: 'JO', color: '#D97706' },
  'P0-2-009': { name: 'Mei-Lin Chen',   role: 'Risk Analyst',          initials: 'MC', color: '#BE185D' },
  'P0-2-010': { name: 'Ravi Sharma',    role: 'Innovation Assessor',   initials: 'RS', color: '#7C3AED' },
  'P0-2-011': { name: 'Claire Dubois',  role: 'Regulatory Specialist', initials: 'CD', color: '#0369A1' },
  'P0-2-012': { name: 'Ben Adeyemi',    role: 'Product Strategist',    initials: 'BA', color: '#4F46E5' },
  'P0-2-013': { name: 'The Council',    role: 'Quality Gate',          initials: 'QG', color: '#8C00B4' },
};`
);

// 2. Add polling useEffect after the realtime subscription useEffect
replace('after realtime subscription',
  `  function resumeFromState(state: CouncilState) {`,
  `  // Polling fallback — refreshes council state every 8s while council is running
  // Ensures UI updates even if Realtime WebSocket drops
  useEffect(() => {
    if (uiPhase !== 'COUNCIL') return;
    const interval = setInterval(async () => {
      if (!projectId) return;
      const { data } = await supabase
        .from('projects')
        .select('council_state')
        .eq('id', projectId)
        .single();
      if (data?.council_state) {
        const s = data.council_state as CouncilState;
        setCouncilState(s);
        syncUiPhaseFromState(s);
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [uiPhase, projectId]);

  function resumeFromState(state: CouncilState) {`
);

// 3. Reset councilState members to PENDING on resubmit so UI shows work immediately
replace('resubmit setUiPhase COUNCIL',
  `                        setConditionalAnswers({});
                        setUiPhase('COUNCIL');`,
  `                        setConditionalAnswers({});
                        // Optimistically reset member statuses so UI shows council working immediately
                        setCouncilState(prev => prev ? {
                          ...prev,
                          phase: 'COUNCIL_RUNNING',
                          verdict: undefined,
                          quality_gate: undefined,
                          conditional_questions: undefined,
                          conditional_questions_rich: undefined,
                          members: Object.fromEntries(
                            Object.keys(prev.members ?? {}).map(k => [k, { status: 'PENDING' as const, title: (prev.members?.[k]?.title ?? k) }])
                          ),
                        } : prev);
                        setUiPhase('COUNCIL');`
);

// 4. Replace the council-grid rendering with human-friendly cards + progress bar
replace('council grid section',
  `            <div className="council-grid">
              {COUNCIL_MEMBER_ORDER.map(id => {
                const member = councilState?.members?.[id];
                const isQG = id === 'P0-2-013';
                return (
                  <div
                    key={id}
                    className={
                      'council-card' +
                      (isQG ? ' council-card--quality-gate' : '') +
                      (member?.status === 'RUNNING' ? ' council-card--running' : '') +
                      (member?.status === 'COMPLETE' ? ' council-card--complete' : '')
                    }
                  >
                    <div className="council-card__header">
                      {memberIcon(member?.status ?? 'PENDING', member?.verdict)}
                      <span className="council-card__id">{id}</span>
                    </div>
                    <div className="council-card__title">{member?.title ?? id}</div>
                    {member?.status === 'RUNNING' && (
                      <div className="council-card__status">REVIEWING\u2026</div>
                    )}
                    {member?.status === 'COMPLETE' && member.verdict && (
                      <div className={\`council-card__verdict council-card__verdict--\${member.verdict.toLowerCase()}\`}>
                        {member.verdict}
                      </div>
                    )}
                    {member?.status === 'COMPLETE' && member.summary && (
                      <div className="council-card__summary">{member.summary}</div>
                    )}
                    {member?.status === 'ERROR' && (
                      <div className="council-card__status council-card__status--error">ERROR</div>
                    )}
                  </div>
                );
              })}
            </div>`,
  `            {/* Progress bar */}
            {(() => {
              const members = councilState?.members ?? {};
              const total = COUNCIL_MEMBER_ORDER.length;
              const done = COUNCIL_MEMBER_ORDER.filter(id => members[id]?.status === 'COMPLETE').length;
              const running = COUNCIL_MEMBER_ORDER.filter(id => members[id]?.status === 'RUNNING').length;
              const pct = Math.round((done / total) * 100);
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    <span>{done} of {total} complete{running > 0 ? \` · \${running} reviewing now\` : ''}</span>
                    <span>{pct}%</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--color-border)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: pct + '%', background: 'var(--color-brand)', borderRadius: '99px', transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              );
            })()}

            <div className="council-grid">
              {COUNCIL_MEMBER_ORDER.map(id => {
                const member = councilState?.members?.[id];
                const profile = COUNCIL_MEMBER_PROFILES[id];
                const isQG = id === 'P0-2-013';
                const status = member?.status ?? 'PENDING';
                return (
                  <div
                    key={id}
                    className={
                      'council-card' +
                      (isQG ? ' council-card--quality-gate' : '') +
                      (status === 'RUNNING' ? ' council-card--running' : '') +
                      (status === 'COMPLETE' ? ' council-card--complete' : '')
                    }
                  >
                    {/* Avatar + name row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                        background: status === 'PENDING' ? '#EBEBEA' : status === 'RUNNING' ? 'rgba(140,0,180,0.12)' : status === 'COMPLETE' ? 'rgba(45,106,79,0.10)' : '#FEF2F2',
                        border: '1px solid ' + (status === 'RUNNING' ? 'rgba(140,0,180,0.3)' : status === 'COMPLETE' ? 'rgba(45,106,79,0.25)' : 'var(--color-border)'),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: 700,
                        color: status === 'PENDING' ? 'var(--color-text-tertiary)' : status === 'RUNNING' ? 'var(--color-brand)' : status === 'COMPLETE' ? '#2D6A4F' : 'var(--color-error)',
                        transition: 'all 0.3s ease',
                      }}>
                        {status === 'RUNNING' ? '●' : status === 'COMPLETE' ? '✓' : status === 'ERROR' ? '✗' : (profile?.initials ?? id.slice(-3))}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {profile?.name ?? id}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                          {profile?.role ?? member?.title ?? id}
                        </div>
                      </div>
                    </div>

                    {/* Status / verdict */}
                    {status === 'PENDING' && (
                      <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>Waiting to review\u2026</div>
                    )}
                    {status === 'RUNNING' && (
                      <div style={{ fontSize: '11px', color: 'var(--color-brand)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ animation: 'pulse 1.2s infinite', display: 'inline-block' }}>●</span> Reviewing now\u2026
                      </div>
                    )}
                    {status === 'COMPLETE' && member?.verdict && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div className={\`council-card__verdict council-card__verdict--\${member.verdict.toLowerCase()}\`}>
                          {member.verdict}
                        </div>
                        {member.confidence && (
                          <span style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>{member.confidence}</span>
                        )}
                      </div>
                    )}
                    {status === 'COMPLETE' && member?.summary && (
                      <div className="council-card__summary">{member.summary}</div>
                    )}
                    {status === 'ERROR' && (
                      <div style={{ fontSize: '11px', color: 'var(--color-error)' }}>Could not complete review</div>
                    )}
                  </div>
                );
              })}
            </div>`
);

if (!ok) process.exit(1);
fs.writeFileSync(filePath, content, { encoding: 'utf8' });
console.log('CouncilPage.tsx patched. Length: ' + content.length);