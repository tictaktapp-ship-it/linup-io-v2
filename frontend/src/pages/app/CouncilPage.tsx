import { useState, useEffect, useRef } from 'react';
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

const API = (path: string) => (import.meta.env.VITE_API_URL as string) + '/api' + path;

// ── Main Component ────────────────────────────────────────────────────────────

export default function CouncilPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // UI phase state
  const [uiPhase, setUiPhase] = useState
    'CONCIERGE' | 'PIS' | 'BRIEF_CONFIRM' | 'COUNCIL' | 'CONDITIONAL' |
    'BLOCKED' | 'PHASE05' | 'CHARTER_CONFIRM' | 'COMPLETE'
  >('CONCIERGE');

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
          setProjectName(data.name ?? '');
          // Resume from existing council_state if present
          if (data.council_state) {
            resumeFromState(data.council_state as CouncilState);
          } else {
            // Fresh project — send first concierge message
            sendConciergeOpener();
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
    setCouncilState(state);
    syncUiPhaseFromState(state);
  }

  function syncUiPhaseFromState(state: CouncilState) {
    const phase = state.phase;
    if (!phase || phase === 'CONCIERGE') return;
    if (phase === 'PIS') { setUiPhase('PIS'); return; }
    if (phase === 'COUNCIL_RUNNING') { setUiPhase('COUNCIL'); return; }
    if (phase === 'AWAITING_FOUNDER_CONDITIONAL') { setUiPhase('CONDITIONAL'); return; }
    if (phase === 'BLOCKED') { setUiPhase('BLOCKED'); return; }
    if (phase === 'PHASE05_RUNNING' || phase === 'PHASE05_STARTING') { setUiPhase('PHASE05'); return; }
    if (phase === 'AWAITING_CHARTER_CONFIRMATION') { setUiPhase('CHARTER_CONFIRM'); return; }
    if (phase === 'COMPLETE') { setUiPhase('COMPLETE'); return; }
  }

  // ── Concierge ───────────────────────────────────────────────────────────────

  async function sendConciergeOpener() {
    setSending(true);
    try {
      const res = await apiFetch('/council/concierge', {
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

  async function sendConciergeMessage() {
    if (!inputValue.trim() || sending) return;
    const userMsg = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setSending(true);
    try {
      const res = await apiFetch('/council/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ projectId, message: userMsg, exchangeCount }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      setExchangeCount(prev => prev + 1);
      if (data.handoffToPis) {
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
      const res = await apiFetch('/council/pis', {
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
      await apiFetch('/council/confirm-brief', {
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
      await apiFetch('/council/confirm-charter', {
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
      if (uiPhase === 'CONCIERGE') sendConciergeMessage();
      else if (uiPhase === 'PIS') sendPisMessage();
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
        <span className="council-topbar__logo">LINUP</span>
        <span className="council-topbar__project">{projectName}</span>
        <span className="council-topbar__phase">
          {uiPhase === 'CONCIERGE' && 'Getting started'}
          {uiPhase === 'PIS' && 'Idea intake'}
          {uiPhase === 'BRIEF_CONFIRM' && 'Confirm your brief'}
          {uiPhase === 'COUNCIL' && 'Council reviewing'}
          {uiPhase === 'CONDITIONAL' && 'Your input needed'}
          {uiPhase === 'BLOCKED' && 'Revision needed'}
          {uiPhase === 'PHASE05' && 'Feature discovery'}
          {uiPhase === 'CHARTER_CONFIRM' && 'Confirm feature charter'}
          {uiPhase === 'COMPLETE' && 'Starting Stage 1…'}
        </span>
      </div>

      <div className="council-body">

        {/* ── CONCIERGE + PIS chat panel ── */}
        {(uiPhase === 'CONCIERGE' || uiPhase === 'PIS' || uiPhase === 'BRIEF_CONFIRM') && (
          <div className="council-chat-layout">
            {/* Left: chat */}
            <div className="council-chat">
              <div className="council-chat__messages">
                {messages.map((m, i) => (
                  <div key={i} className={'council-msg council-msg--' + m.role}>
                    {m.role === 'assistant' && (
                      <span className="council-msg__label">
                        {uiPhase === 'CONCIERGE' ? 'Concierge' : 'Product Intake Specialist'}
                      </span>
                    )}
                    <p className="council-msg__text">{m.content}</p>
                  </div>
                ))}
                {sending && (
                  <div className="council-msg council-msg--assistant">
                    <span className="council-msg__label">
                      {uiPhase === 'CONCIERGE' ? 'Concierge' : 'Product Intake Specialist'}
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
                    onClick={uiPhase === 'CONCIERGE' ? sendConciergeMessage : sendPisMessage}
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
        {(uiPhase === 'COUNCIL' || uiPhase === 'CONDITIONAL' || uiPhase === 'BLOCKED') && (
          <div className="council-review-layout">
            <div className="council-review-header">
              <h2 className="council-review-title">
                {uiPhase === 'COUNCIL' && 'Council reviewing your idea…'}
                {uiPhase === 'CONDITIONAL' && 'Council complete — your input needed'}
                {uiPhase === 'BLOCKED' && 'Council complete — revision needed'}
              </h2>
              {uiPhase === 'COUNCIL' && (
                <p className="council-review-sub">
                  13 specialists are reviewing your Idea Brief simultaneously. This takes about 8–10 minutes.
                </p>
              )}
            </div>

            <div className="council-grid">
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
                      <div className="council-card__status">REVIEWING…</div>
                    )}
                    {member?.status === 'COMPLETE' && member.verdict && (
                      <div className={'council-card__verdict council-card__verdict--' + member.verdict.toLowerCase()}>
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

            {/* Conditional questions */}
            {uiPhase === 'CONDITIONAL' && councilState?.conditional_questions && (
              <div className="council-conditional">
                <h3 className="council-conditional__title">Questions for you</h3>
                <ol className="council-conditional__list">
                  {councilState.conditional_questions.map((q, i) => (
                    <li key={i} className="council-conditional__item">{q}</li>
                  ))}
                </ol>
                <p className="council-conditional__hint">
                  Revise your Idea Brief to address these, then resubmit.
                </p>
                <button
                  className="council-btn council-btn--primary"
                  onClick={() => { setMessages([]); setPisHistory([]); setIdeaBrief(null); setUiPhase('PIS'); }}
                >
                  Revise and resubmit →
                </button>
              </div>
            )}

            {/* Blocked */}
            {uiPhase === 'BLOCKED' && councilState?.quality_gate?.blockedReason && (
              <div className="council-blocked">
                <h3 className="council-blocked__title">Why this idea was blocked</h3>
                <p className="council-blocked__reason">{councilState.quality_gate.blockedReason}</p>
                <button
                  className="council-btn council-btn--primary"
                  onClick={() => { setMessages([]); setPisHistory([]); setIdeaBrief(null); setUiPhase('PIS'); }}
                >
                  Revise and resubmit →
                </button>
              </div>
            )}
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
