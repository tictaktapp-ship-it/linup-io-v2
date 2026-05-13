import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../../lib/api';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
}

interface IdeaBrief {
  problem: string;
  primary_user: string;
  domain: string;
  constraints: string;
  unique_insight: string;
  summary: string;
}

interface CouncilMember {
  status: 'PENDING' | 'RUNNING' | 'COMPLETE' | 'ERROR';
  title: string;
  verdict?: string;
  confidence?: string;
  summary?: string;
  error?: string;
}

interface CouncilState {
  phase: string;
  members?: Record<string, CouncilMember>;
  verdict?: string;
  conditional_questions?: string[];
  conditional_questions_rich?: Array<{ question: string; options: string[] }> | null;
  quality_gate?: { verdict: string; assessment: string; blockedReason: string | null };
  idea_brief?: IdeaBrief;
  phase05?: {
    members?: Record<string, CouncilMember>;
    feature_charter?: string;
    phase?: string;
  };
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COUNCIL_MEMBER_ORDER = [
  'P0-2-001','P0-2-002','P0-2-003','P0-2-004','P0-2-005','P0-2-006',
  'P0-2-007','P0-2-008','P0-2-009','P0-2-010','P0-2-011','P0-2-012',
  'P0-2-013',
];

const PHASE05_MEMBER_ORDER = [
  'P05-1-001','P05-1-002','P05-2-001','P05-2-002','P05-2-003',
];


// ── Main Component ────────────────────────────────────────────────────────────

// Generate structured answer options for a conditional question
const COUNCIL_MEMBER_PROFILES: Record<string, { name: string; role: string; initials: string }> = {
  'P0-2-001': { name: 'Marcus Webb',     role: 'Market Analyst',        initials: 'MW' },
  'P0-2-002': { name: 'Priya Nair',      role: 'Customer Advocate',     initials: 'PN' },
  'P0-2-003': { name: 'Daniel Osei',     role: 'Competitive Analyst',   initials: 'DO' },
  'P0-2-004': { name: 'Sarah Lindqvist', role: 'Business Strategist',   initials: 'SL' },
  'P0-2-005': { name: 'Tom Hargreaves',  role: 'Technical Assessor',    initials: 'TH' },
  'P0-2-006': { name: 'Aisha Kamara',    role: 'Security Reviewer',     initials: 'AK' },
  'P0-2-007': { name: 'Lena Fischer',    role: 'Ethics Officer',        initials: 'LF' },
  'P0-2-008': { name: 'James Okafor',    role: 'Financial Analyst',     initials: 'JO' },
  'P0-2-009': { name: 'Mei-Lin Chen',    role: 'Risk Analyst',          initials: 'MC' },
  'P0-2-010': { name: 'Ravi Sharma',     role: 'Innovation Assessor',   initials: 'RS' },
  'P0-2-011': { name: 'Claire Dubois',   role: 'Regulatory Specialist', initials: 'CD' },
  'P0-2-012': { name: 'Ben Adeyemi',     role: 'Product Strategist',    initials: 'BA' },
  'P0-2-013': { name: 'The Council',     role: 'Quality Gate',          initials: 'QG' },
};

function generateConditionalOptions(question: string): string[] {
  const q = question.toLowerCase();
  if (q.includes('evidence') || q.includes('data') || q.includes('validation') || q.includes('survey') || q.includes('research')) {
    return [
      'Yes — I have existing data or research I can reference',
      'Partially — I have informal evidence but nothing formal yet',
      'Not yet — but I can gather this before launch',
      'No — I am currently relying on assumption and market intuition',
    ];
  }
  if (q.includes('revenue') || q.includes('monetis') || q.includes('pricing') || q.includes('business model')) {
    return [
      'Subscription with clear pricing tiers already defined',
      'Transaction or usage-based fee model',
      'Freemium with a paid upgrade path',
      'Still exploring — open to the best model for the market',
    ];
  }
  if (q.includes('compli') || q.includes('regulat') || q.includes('legal') || q.includes('gdpr') || q.includes('coppa')) {
    return [
      'Yes — I have researched this and have a compliance plan',
      'Partially — I am aware of requirements but need specialist input',
      'I will address this before launch with legal help',
      'Lower risk for my specific use case and geography',
    ];
  }
  if (q.includes('compet') || q.includes('differentiat') || q.includes('unique') || q.includes('alternative')) {
    return [
      'Strong differentiation — clear unique value competitors lack',
      'Some differentiation — better UX or pricing than alternatives',
      'Niche focus — serving an underserved segment of existing market',
      'Still developing — the differentiation needs more definition',
    ];
  }
  if (q.includes('user') || q.includes('customer') || q.includes('audience') || q.includes('target')) {
    return [
      'Very specific — I have a well-defined primary user persona',
      'Fairly clear — I know the segment but not every detail',
      'Broad — targeting multiple user types initially',
      'Still refining — I need more discovery conversations',
    ];
  }
  return [
    'Fully addressed — I have a clear and tested answer',
    'Mostly addressed — solid thinking with some gaps to fill',
    'Partially addressed — I have a direction but need to develop it',
    'Not yet addressed — this is a genuine open question for me',
  ];
}

export default function CouncilPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // UI phase state
  const [uiPhase, setUiPhase] = useState<
    'PIS' | 'BRIEF_CONFIRM' | 'COUNCIL' | 'CONDITIONAL' |
    'PHASE05' | 'CHARTER_CONFIRM' | 'COMPLETE'
  >('PIS');

  const [pageLoaded, setPageLoaded] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [exchangeCount, setExchangeCount] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // PIS state
  const [pisHistory, setPisHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [ideaBrief, setIdeaBrief] = useState<IdeaBrief | null>(null);

  // Council state (live via Realtime)
  const [councilState, setCouncilState] = useState<CouncilState | null>(null);
  const [projectName, setProjectName] = useState('');
  // Conditional question answers
  const [conditionalAnswers, setConditionalAnswers] = useState<Record<number, { selected: string; freeText: string }>>({});
  const [resubmitting, setResubmitting] = useState(false);
  const [topbarLogoFailed, setTopbarLogoFailed] = useState(false);

  // Scroll chat to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load project name
  useEffect(() => {
    if (!projectId) return;
    supabase
      .from('projects')
      .select('name, council_state')
      .eq('id', projectId)
      .single()
      .then(({ data }) => {
        if (data) {
          console.log('[CouncilPage] project loaded, name=', data.name, 'has council_state=', !!data.council_state, 'phase=', (data.council_state as any)?.phase);
          setProjectName(data.name ?? '');
          // Resume from existing council_state if present
          if (data.council_state) {
            resumeFromState(data.council_state as CouncilState);
            setPageLoaded(true);
          } else {
            // Fresh project — go straight to PIS
            setPageLoaded(true);
            sendPisOpener();
          }
        }
      });
  }, [projectId]);

  // Supabase Realtime — watch council_state updates
  useEffect(() => {
    if (!projectId) return;
    const channel = supabase
      .channel('council-' + projectId)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'projects', filter: 'id=eq.' + projectId },
        (payload) => {
          const newState = (payload.new as { council_state: CouncilState }).council_state;
          if (newState) {
            setCouncilState(newState);
            syncUiPhaseFromState(newState);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [projectId]);

  function resumeFromState(state: CouncilState) {
    console.log('[CouncilPage] resumeFromState called, phase=', state?.phase);
    setCouncilState(state);
    syncUiPhaseFromState(state);
  }

  function syncUiPhaseFromState(state: CouncilState) {
    const phase = state.phase;
    console.log('[CouncilPage] syncUiPhaseFromState called, phase=', phase, 'uiPhase=', uiPhase);
    if (!phase || phase === 'CONCIERGE') return;
    if (phase === 'PIS') { setUiPhase('PIS'); return; }
    if (phase === 'COUNCIL_RUNNING') { setUiPhase('COUNCIL'); return; }
    if (phase === 'AWAITING_FOUNDER_CONDITIONAL') { setUiPhase('CONDITIONAL'); return; }
    if (phase === 'BLOCKED') { setUiPhase('CONDITIONAL'); return; }
    if (phase === 'PHASE05_RUNNING' || phase === 'PHASE05_STARTING') { setUiPhase('PHASE05'); return; }
    if (phase === 'AWAITING_CHARTER_CONFIRMATION') { setUiPhase('CHARTER_CONFIRM'); return; }
    if (phase === 'COMPLETE') { setUiPhase('COMPLETE'); return; }
  }

  // ── Concierge ───────────────────────────────────────────────────────────────

  async function sendConciergeOpener() {
    setSending(true);
    try {
      const res = await apiFetch('/api/council/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ projectId, message: 'Hello', exchangeCount: 0 }),
      });
      const data = await res.json();
      setMessages([{ role: 'assistant', content: data.reply }]);
      setExchangeCount(1);
      if (data.handoffToPis) setUiPhase('PIS');
    } finally {
      setSending(false);
    }
  }

  // Send PIS opening message (replaces concierge — PIS introduces herself directly)
  async function sendPisOpener() {
    setSending(true);
    try {
      const res = await apiFetch('/api/council/pis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ projectId, message: '__OPEN__', history: [] }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages([{ role: 'assistant', content: data.reply }]);
        setPisHistory([{ role: 'assistant', content: data.reply }]);
      } else {
        console.error('PIS opener failed:', data);
      }
    } finally {
      setSending(false);
    }
  }

  async function sendConciergeMessage() {
    if (!inputValue.trim() || sending) return;
    const userMsg = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setSending(true);
    try {
      const res = await apiFetch('/api/council/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ projectId, message: userMsg, exchangeCount }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      setExchangeCount(prev => prev + 1);
      if (data.handoffToPis) {
        const hist = [...messages, { role: 'user', content: userMsg }, { role: 'assistant', content: data.reply }];
        setPisHistory(hist);
        setTimeout(() => setUiPhase('PIS'), 800);
      }
    } finally {
      setSending(false);
    }
  }
  // ── PIS ─────────────────────────────────────────────────────────────────────

  async function sendPisMessage() {
    if (!inputValue.trim() || sending) return;
    const userMsg = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setSending(true);

    const newHistory = [...pisHistory, { role: 'user', content: userMsg }];

    try {
      const res = await apiFetch('/api/council/pis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ projectId, message: userMsg, history: pisHistory }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      const updatedHistory = [...newHistory, { role: 'assistant', content: data.reply }];
      setPisHistory(updatedHistory);

      if (data.briefComplete && data.ideaBrief) {
        setIdeaBrief(data.ideaBrief);
        setTimeout(() => setUiPhase('BRIEF_CONFIRM'), 600);
      }
    } finally {
      setSending(false);
    }
  }

  async function confirmBrief() {
    if (!ideaBrief) return;
    setSending(true);
    try {
      await apiFetch('/api/council/confirm-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ projectId, ideaBrief }),
      });
      setUiPhase('COUNCIL');
    } finally {
      setSending(false);
    }
  }

  // ── Charter confirmation ─────────────────────────────────────────────────────

  async function confirmCharter() {
    setSending(true);
    try {
      await apiFetch('/api/council/confirm-charter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ projectId }),
      });
      setUiPhase('COMPLETE');
      setTimeout(() => navigate('/app/project/' + projectId), 1200);
    } finally {
      setSending(false);
    }
  }

  // ── Keyboard handler ─────────────────────────────────────────────────────────

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (uiPhase === 'PIS') sendPisMessage();
    }
  }

  // ── Member status icon ───────────────────────────────────────────────────────

  function memberIcon(status: string, verdict?: string) {
    if (status === 'PENDING') return <span className="council-dot council-dot--pending">□</span>;
    if (status === 'RUNNING') return <span className="council-dot council-dot--running">●</span>;
    if (status === 'ERROR')   return <span className="council-dot council-dot--error">✖</span>;
    if (status === 'COMPLETE') {
      if (verdict === 'APPROVED') return <span className="council-dot council-dot--approved">✓</span>;
      if (verdict === 'BLOCKED')  return <span className="council-dot council-dot--blocked">✖</span>;
      return <span className="council-dot council-dot--complete">✓</span>;
    }
    return null;
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="council-page">
      <div className="council-topbar">
        {topbarLogoFailed ? (
          <span className="council-topbar__logo">LINUP</span>
        ) : (
          <img src="/logo.png" alt="LINUP" style={{ height: '24px', width: 'auto', display: 'block' }} onError={() => setTopbarLogoFailed(true)} />
        )}
        <span className="council-topbar__project">{projectName}</span>
        <span className="council-topbar__phase">
          {uiPhase === 'PIS' && 'Idea intake'}
          {uiPhase === 'BRIEF_CONFIRM' && 'Confirm your brief'}
          {uiPhase === 'COUNCIL' && 'Council reviewing'}
          {uiPhase === 'CONDITIONAL' && 'Your input needed'}
          {uiPhase === 'PHASE05' && 'Feature discovery'}
          {uiPhase === 'CHARTER_CONFIRM' && 'Confirm feature charter'}
          {uiPhase === 'COMPLETE' && 'Starting Stage 1…'}
        </span>
      </div>

      <div className="council-body">

        {!pageLoaded && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--color-text-tertiary)', fontSize: '14px', padding: '40px' }}>
            Loading…
          </div>
        )}

        {/* ── CONCIERGE + PIS chat panel ── */}
        {(uiPhase === 'PIS' || uiPhase === 'BRIEF_CONFIRM') && (
          <div className="council-chat-layout">
            {/* Left: chat */}
            <div className="council-chat">
              <div className="council-chat__messages">
                {messages.map((m, i) => (
                  <div key={i} className={'council-msg council-msg--' + m.role}>
                    {m.role === 'assistant' && (
                      <span className="council-msg__label">
                        {'Sarah Chen — Intake Specialist'}
                      </span>
                    )}
                    <p className="council-msg__text">{m.content}</p>
                  </div>
                ))}
                {sending && (
                  <div className="council-msg council-msg--assistant">
                    <span className="council-msg__label">
                      {'Sarah Chen — Intake Specialist'}
                    </span>
                    <p className="council-msg__text council-msg__text--typing">Thinking…</p>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {uiPhase !== 'BRIEF_CONFIRM' && (
                <div className="council-chat__input-row">
                  <textarea
                    className="council-chat__input"
                    placeholder="Type your message…"
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={2}
                    disabled={sending}
                  />
                  <button
                    className="council-chat__send"
                    disabled={sending || !inputValue.trim()}
                    onClick={sendPisMessage}
                  >
                    Send →
                  </button>
                </div>
              )}

              {uiPhase === 'BRIEF_CONFIRM' && (
                <div className="council-brief-confirm-actions">
                  <p className="council-brief-confirm-hint">
                    Your Idea Brief is ready. Review it on the right, then confirm to send it to the Council.
                  </p>
                  <button
                    className="council-btn council-btn--primary"
                    onClick={confirmBrief}
                    disabled={sending}
                  >
                    {sending ? 'Sending to Council…' : 'Confirm brief and start Council →'}
                  </button>
                  <button
                    className="council-btn council-btn--ghost"
                    onClick={() => setUiPhase('PIS')}
                    disabled={sending}
                  >
                    Edit my answers
                  </button>
                </div>
              )}
            </div>

            {/* Right: Idea Brief preview (shows during PIS + BRIEF_CONFIRM) */}
            {(uiPhase === 'PIS' || uiPhase === 'BRIEF_CONFIRM') && (
              <div className="council-brief-panel">
                <h3 className="council-brief-panel__title">YOUR IDEA BRIEF</h3>
                <p className="council-brief-panel__hint">
                  {ideaBrief ? 'Building live as you answer…' : 'Appears here as your intake conversation progresses.'}
                </p>
                {ideaBrief && (
                  <div className="council-brief-fields">
                    {([
                      ['Problem', ideaBrief.problem],
                      ['Primary user', ideaBrief.primary_user],
                      ['Domain', ideaBrief.domain],
                      ['Constraints', ideaBrief.constraints],
                      ['Your unique insight', ideaBrief.unique_insight],
                      ['Summary', ideaBrief.summary],
                    ] as [string, string][]).map(([label, value]) => (
                      <div key={label} className="council-brief-field">
                        <span className="council-brief-field__label">{label}</span>
                        <span className="council-brief-field__value">{value || '—'}</span>
                      </div>
                    ))}
                  </div>
                )}
                {!ideaBrief && (
                  <div className="council-brief-empty">
                    <div className="council-brief-skeleton" />
                    <div className="council-brief-skeleton council-brief-skeleton--short" />
                    <div className="council-brief-skeleton" />
                    <div className="council-brief-skeleton council-brief-skeleton--short" />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── COUNCIL running grid ── */}
        {(uiPhase === 'COUNCIL' || uiPhase === 'CONDITIONAL') && (
          <div className="council-review-layout">
            <div className="council-review-header">
              <h2 className="council-review-title">
                {uiPhase === 'COUNCIL' && 'Council reviewing your idea…'}
                {uiPhase === 'CONDITIONAL' && 'Council complete — your input needed'}
              </h2>
              {uiPhase === 'COUNCIL' && (
                <p className="council-review-sub">
                  13 specialists are reviewing your Idea Brief simultaneously. This takes about 8–10 minutes.
                </p>
              )}
            </div>

            {/* Progress bar */}
            {(() => {
              const mems = councilState?.members ?? {};
              const total = COUNCIL_MEMBER_ORDER.length;
              const done = COUNCIL_MEMBER_ORDER.filter(id => mems[id]?.status === 'COMPLETE').length;
              const running = COUNCIL_MEMBER_ORDER.filter(id => mems[id]?.status === 'RUNNING').length;
              const pct = Math.round((done / total) * 100);
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    <span>{done} of {total} reviewed{running > 0 ? ' · ' + running + ' reviewing now' : ''}</span>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <div style={{
                        width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                        background: status === 'PENDING' ? '#F0F0EE' : status === 'RUNNING' ? 'rgba(140,0,180,0.10)' : status === 'COMPLETE' ? 'rgba(45,106,79,0.10)' : '#FEF2F2',
                        border: '1px solid ' + (status === 'RUNNING' ? 'rgba(140,0,180,0.3)' : status === 'COMPLETE' ? 'rgba(45,106,79,0.25)' : 'var(--color-border)'),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: status === 'PENDING' ? '11px' : '14px', fontWeight: 700,
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
                    {status === 'PENDING' && (
                      <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>Waiting…</div>
                    )}
                    {status === 'RUNNING' && (
                      <div style={{ fontSize: '11px', color: 'var(--color-brand)', fontWeight: 600 }}>
                        Reviewing now…
                      </div>
                    )}
                    {status === 'COMPLETE' && member?.verdict && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <div className={'council-card__verdict council-card__verdict--' + member.verdict.toLowerCase()}>
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
            </div>

            {/* Quality Gate verdict */}
            {councilState?.quality_gate && (
              <div className={'council-verdict-banner council-verdict-banner--' + (councilState.verdict ?? '').toLowerCase()}>
                <div className="council-verdict-banner__verdict">
                  {councilState.verdict === 'APPROVED' && '✓ APPROVED'}
                  {councilState.verdict === 'CONDITIONAL' && '● CONDITIONAL — your input needed'}
                  {councilState.verdict === 'BLOCKED' && '✖ BLOCKED — revision required'}
                </div>
                <div className="council-verdict-banner__assessment">
                  {councilState.quality_gate.assessment}
                </div>
              </div>
            )}

            {/* Conditional questions -- interactive form */}
            {uiPhase === 'CONDITIONAL' && councilState?.conditional_questions && (
              <div className="council-conditional">
                <h3 className="council-conditional__title">Questions for you</h3>
                <p className="council-conditional__hint" style={{ marginBottom: '8px' }}>
                  Answer each question below. Your answers will be added to your brief and the Council will re-run automatically.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '8px' }}>
                  {councilState.conditional_questions.map((q, i) => {
                    const options = generateConditionalOptions(q);
                    const ans = conditionalAnswers[i] ?? { selected: '', freeText: '' };
                    return (
                      <div key={i} style={{ background: '#F9FAFB', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {i + 1}. {q}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {options.map((opt, oi) => (
                            <label key={oi} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 12px', border: '1px solid ' + (ans.selected === opt ? 'var(--color-brand)' : 'var(--color-border)'), borderRadius: '6px', background: ans.selected === opt ? 'rgba(140,0,180,0.05)' : '#FFFFFF', cursor: 'pointer', fontSize: '13px', color: 'var(--color-text-primary)', transition: 'border-color 0.15s' }}>
                              <input type="radio" name={'q-' + i} value={opt} checked={ans.selected === opt}
                                onChange={() => setConditionalAnswers(prev => ({ ...prev, [i]: { ...(prev[i] ?? { freeText: '' }), selected: opt } }))}
                                style={{ accentColor: 'var(--color-brand)', marginTop: '2px', flexShrink: 0 }}
                              />
                              {opt}
                            </label>
                          ))}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Additional detail (optional)</label>
                          <textarea rows={2} placeholder="Add any specifics or context..."
                            value={ans.freeText}
                            onChange={e => setConditionalAnswers(prev => ({ ...prev, [i]: { ...(prev[i] ?? { selected: '' }), freeText: e.target.value } }))}
                            style={{ padding: '8px 10px', background: '#FFFFFF', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--color-text-primary)', fontSize: '13px', resize: 'vertical', fontFamily: 'var(--font-sans)', outline: 'none', lineHeight: 1.5 }}
                            onFocus={e => { e.target.style.borderColor = 'var(--color-brand)'; }}
                            onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
                  <button className="council-btn council-btn--primary"
                    disabled={resubmitting || Object.keys(conditionalAnswers).length < (councilState.conditional_questions?.length ?? 0)}
                    onClick={async () => {
                      if (!councilState?.conditional_questions) return;
                      setResubmitting(true);
                      try {
                        const answers = councilState.conditional_questions.map((q, i) => ({
                          question: q,
                          selectedOption: conditionalAnswers[i]?.selected ?? '',
                          freeText: conditionalAnswers[i]?.freeText ?? '',
                        }));
                        await apiFetch('/api/council/resubmit-conditional', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
                          body: JSON.stringify({ projectId, answers }),
                        });
                        setConditionalAnswers({});
                        setUiPhase('COUNCIL');
                      } finally { setResubmitting(false); }
                    }}
                  >
                    {resubmitting ? 'Resubmitting...' : 'Submit answers and re-run Council'}
                  </button>
                  <button className="council-btn council-btn--ghost" disabled={resubmitting}
                    onClick={() => { setMessages([]); setPisHistory([]); setIdeaBrief(null); setConditionalAnswers({}); setUiPhase('PIS'); }}
                  >
                    Revise brief instead
                  </button>
                </div>
              </div>
            )}

            {/* Blocked */}
            
          </div>
        )}

        {/* ── PHASE 0.5 ── */}
        {uiPhase === 'PHASE05' && (
          <div className="council-phase05-layout">
            <div className="council-review-header">
              <h2 className="council-review-title">Feature Discovery — Phase 0.5</h2>
              <p className="council-review-sub">
                Your idea was approved. 5 specialists are now mapping your features and defining your MVP.
                This takes about 5–8 minutes.
              </p>
            </div>
            <div className="council-phase05-steps">
              {PHASE05_MEMBER_ORDER.map((id, idx) => {
                const member = councilState?.phase05?.members?.[id];
                return (
                  <div
                    key={id}
                    className={
                      'council-phase05-step' +
                      (member?.status === 'RUNNING' ? ' council-phase05-step--running' : '') +
                      (member?.status === 'COMPLETE' ? ' council-phase05-step--complete' : '')
                    }
                  >
                    <div className="council-phase05-step__number">{idx + 1}</div>
                    <div className="council-phase05-step__info">
                      <div className="council-phase05-step__title">{member?.title ?? id}</div>
                      <div className="council-phase05-step__status">
                        {(!member || member.status === 'PENDING') && 'Waiting'}
                        {member?.status === 'RUNNING' && '● Working…'}
                        {member?.status === 'COMPLETE' && '✓ Complete'}
                        {member?.status === 'ERROR' && '✖ Error'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── CHARTER CONFIRMATION ── */}
        {uiPhase === 'CHARTER_CONFIRM' && (
          <div className="council-charter-layout">
            <div className="council-review-header">
              <h2 className="council-review-title">Your Feature Charter is ready</h2>
              <p className="council-review-sub">
                Review the charter below. When you confirm, Stage 1 of your engineering specification begins.
              </p>
            </div>
            <div className="council-charter-content">
              <pre className="council-charter-text">
                {councilState?.phase05?.feature_charter ?? 'Loading charter…'}
              </pre>
            </div>
            <div className="council-charter-actions">
              <button
                className="council-btn council-btn--primary"
                onClick={confirmCharter}
                disabled={sending}
              >
                {sending ? 'Starting Stage 1…' : 'Confirm charter → Stage 1 begins'}
              </button>
            </div>
          </div>
        )}

        {/* ── COMPLETE transition ── */}
        {uiPhase === 'COMPLETE' && (
          <div className="council-complete">
            <div className="council-complete__icon">✓</div>
            <h2 className="council-complete__title">Stage 1 is starting…</h2>
            <p className="council-complete__sub">Taking you to your workspace.</p>
          </div>
        )}

      </div>
    </div>
  );
}
