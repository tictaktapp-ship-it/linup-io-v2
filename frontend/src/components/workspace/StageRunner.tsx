import { useState } from 'react';
import { apiFetch } from '../../lib/api';
import type { Project, StageRun } from '../../pages/app/WorkspacePage';

// ── Stub IC group data (replaced by real data in Phase 6) ───────────────
interface IcMember { id: string; name: string; status: 'DONE' | 'RUNNING' | 'WAITING'; }
interface IcGroup { id: string; label: string; members: IcMember[]; vpReview: boolean; }

function getStubGroups(stage: number): IcGroup[] {
  return [{
    id: 'group-a',
    label: 'Stage ' + stage + 'A — Core Specialists',
    members: [
      { id: '001', name: 'LEAD SPECIALIST', status: 'DONE' },
      { id: '002', name: 'DOMAIN EXPERT', status: 'RUNNING' },
      { id: '003', name: 'REVIEWER', status: 'WAITING' },
    ],
    vpReview: true,
  }];
}

// ── IcMemberChip ─────────────────────────────────────────────────────────
function IcMemberChip({ member }: { member: IcMember }) {
  const label = member.status === 'DONE' ? '✓ Done'
    : member.status === 'RUNNING' ? '● Running...'
    : '□ Waiting';
  return (
    <div className={'ic-chip ic-chip--' + member.status.toLowerCase()}>
      <span className='ic-chip__name'>{member.name}</span>
      <span className='ic-chip__status'>{label}</span>
    </div>
  );
}

// ── IcGroupCard ──────────────────────────────────────────────────────────
function IcGroupCard({ group }: { group: IcGroup }) {
  const done = group.members.filter((m) => m.status === 'DONE').length;
  const total = group.members.length;
  const pct = Math.round((done / total) * 100);
  return (
    <div className='ic-group-card'>
      <div className='ic-group-card__header'>
        <span className='ic-group-card__label'>{group.label}</span>
      </div>
      <div className='ic-group-card__members'>
        {group.members.map((m) => <IcMemberChip key={m.id} member={m} />)}
      </div>
      <div className='ic-group-card__progress'>
        <div className='ic-group-card__bar'>
          <div className='ic-group-card__bar-fill' style={{ width: pct + '%' }} />
        </div>
        <span className='ic-group-card__count'>{done} / {total}  {pct}%</span>
      </div>
      {group.vpReview && <p className='ic-group-card__vp-note'>VP review after group completes</p>}
    </div>
  );
}

// ── CheckpointBanner1 ────────────────────────────────────────────────────
function CheckpointBanner1() {
  return (
    <div className='checkpoint-banner checkpoint-banner--1'>
      <p className='checkpoint-banner__title'>👥 TEAM PROGRESS</p>
      <p>Your team has completed their initial work on this stage.</p>
      <p>Your independent reviewer is now checking their work.</p>
      <button className='btn btn--ghost'>Flag a concern</button>
    </div>
  );
}

// ── CheckpointBanner2 ────────────────────────────────────────────────────
function CheckpointBanner2({ onReview }: { onReview: () => void }) {
  return (
    <div className='checkpoint-banner checkpoint-banner--2'>
      <p className='checkpoint-banner__title'>✅ Stage review complete</p>
      <p>Your team has prepared questions for you to answer before the stage locks.</p>
      <button className='btn btn--primary' onClick={onReview}>Review your questions →</button>
    </div>
  );
}

// ── OptionDExpander ──────────────────────────────────────────────────────
function OptionDExpander({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className='option-d'>
      <p className='option-d__label'>Tell us your approach (max 200 characters):</p>
      <textarea
        className='option-d__input'
        maxLength={200}
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className='option-d__count'>{value.length} / 200</span>
    </div>
  );
}

// ── FounderQuestion ──────────────────────────────────────────────────────
interface Question {
  id: string;
  text: string;
  rationale: string;
  options: { key: string; text: string; recommended?: boolean }[];
}

function FounderQuestion({
  question, index, total, onAnswer
}: {
  question: Question;
  index: number;
  total: number;
  onAnswer: (questionId: string, key: string, freeText?: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [freeText, setFreeText] = useState('');
  const [rationaleOpen, setRationaleOpen] = useState(false);

  function handleConfirm() {
    if (!selected) return;
    onAnswer(question.id, selected, selected === 'D' ? freeText : undefined);
  }

  return (
    <div className='founder-question'>
      <div className='founder-question__header'>
        <span>Question {index + 1} of {total}</span>
      </div>
      <p className='founder-question__text'>{question.text}</p>
      <button
        className='founder-question__rationale-toggle'
        onClick={() => setRationaleOpen((o) => !o)}
      >
        Why this matters {rationaleOpen ? '▴' : '▾'}
      </button>
      {rationaleOpen && <p className='founder-question__rationale'>{question.rationale}</p>}
      <div className='founder-question__options'>
        {question.options.map((opt) => (
          <label key={opt.key} className={'founder-question__option' + (selected === opt.key ? ' founder-question__option--selected' : '')}>
            <input
              type='radio'
              name={question.id}
              value={opt.key}
              checked={selected === opt.key}
              onChange={() => setSelected(opt.key)}
            />
            <span>{opt.key}  {opt.text}</span>
            {opt.recommended && <span className='founder-question__rec'>⭐ REC</span>}
          </label>
        ))}
      </div>
      {selected === 'D' && <OptionDExpander value={freeText} onChange={setFreeText} />}
      <div className='founder-question__actions'>
        <button className='btn btn--ghost'>Skip for now</button>
        <button
          className='btn btn--primary'
          disabled={!selected || (selected === 'D' && freeText.trim().length === 0)}
          onClick={handleConfirm}
        >
          Confirm answer →
        </button>
      </div>
    </div>
  );
}

// ── AssumedDecisions ─────────────────────────────────────────────────────
interface AssumedDecision { id: string; title: string; explanation: string; }

function AssumedDecisions({
  decisions, onContinue
}: {
  decisions: AssumedDecision[];
  onContinue: () => void;
}) {
  return (
    <div className='assumed-decisions'>
      <p className='assumed-decisions__title'>DECISIONS YOUR TEAM MADE ON YOUR BEHALF</p>
      <p className='assumed-decisions__sub'>You can review and flag any to revisit.</p>
      {decisions.map((d) => (
        <div key={d.id} className='assumed-decisions__item'>
          <span className='assumed-decisions__dot'>🔵</span>
          <div>
            <p className='assumed-decisions__item-title'>{d.title}</p>
            <p className='assumed-decisions__item-text'>{d.explanation}</p>
            <button className='btn btn--ghost btn--sm'>Flag to revisit</button>
          </div>
        </div>
      ))}
      <button className='btn btn--primary' onClick={onContinue}>Continue to next stage →</button>
    </div>
  );
}

// ── DeadlockBanner ───────────────────────────────────────────────────────
function DeadlockBanner({
  stageName, issue, options, onResolve
}: {
  stageName: string;
  issue: string;
  options: { key: string; text: string; recommended?: boolean }[];
  onResolve: (key: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div className='deadlock-banner'>
      <p className='deadlock-banner__title'>⚠ YOUR TEAM IS STUCK</p>
      <p>{stageName} has been reviewed 3 times without reaching a clear answer.</p>
      <p className='deadlock-banner__issue'>The issue: {issue}</p>
      <div className='deadlock-banner__options'>
        {options.map((opt) => (
          <label key={opt.key} className={'deadlock-banner__option' + (selected === opt.key ? ' deadlock-banner__option--selected' : '')}>
            <input type='radio' name='deadlock' value={opt.key} checked={selected === opt.key} onChange={() => setSelected(opt.key)} />
            <span>{opt.key}  {opt.text}</span>
            {opt.recommended && <span className='founder-question__rec'>⭐ RECOMMENDED</span>}
          </label>
        ))}
      </div>
      <button className='btn btn--primary' disabled={!selected} onClick={() => selected && onResolve(selected)}>Resolve and continue</button>
    </div>
  );
}

// ── StageRunner (main export) ─────────────────────────────────────────────
type CentreView = 'RUNNING' | 'CHECKPOINT_1' | 'QUESTIONS' | 'ASSUMED' | 'DEADLOCKED' | 'IDLE';

interface Props {
  project: Project;
  activeStageRun: StageRun | null;
  stageRuns: StageRun[];
}

export function StageRunner({ project, activeStageRun }: Props) {
  const [centreView, setCentreView] = useState<CentreView>('IDLE');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  async function handleStart() {
    setStarting(true);
    setStartError(null);
    try {
      const res = await apiFetch('/api/pipeline/run/' + project.id + '/' + project.current_stage, {
        method: 'POST',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setStartError(body.error ?? 'Failed to start pipeline');
      }
    } catch {
      setStartError('Could not reach the server. Please try again.');
    } finally {
      setStarting(false);
    }
  }

  // Derive view from activeStageRun status (Realtime updates drive this)
  const status = activeStageRun?.status ?? 'IDLE';
  const derivedView: CentreView =
    status === 'RUNNING'          ? 'RUNNING'
    : status === 'AWAITING_FOUNDER' ? 'QUESTIONS'
    : status === 'DEADLOCKED'      ? 'DEADLOCKED'
    : 'IDLE';

  const view = centreView !== 'IDLE' ? centreView : derivedView;

  // Stub questions (replaced by API data in Phase 6)
  const stubQuestions: Question[] = [
    {
      id: 'q1',
      text: 'How should old user data be handled?',
      rationale: 'Your data retention policy affects legal compliance, storage costs, and what happens when users delete their accounts.',
      options: [
        { key: 'A', text: 'Delete after 90 days of inactivity' },
        { key: 'B', text: 'Keep indefinitely, user can export', recommended: true },
        { key: 'C', text: 'Delete immediately on account closure' },
        { key: 'D', text: 'I have a different approach' },
      ],
    },
  ];

  const stubAssumed: AssumedDecision[] = [
    { id: 'a1', title: 'UUID format for primary keys', explanation: 'Your team chose UUID v4 format for all PKs. Standard choice for PostgreSQL.' },
    { id: 'a2', title: 'Soft deletes for user data', explanation: 'Records marked deleted_at rather than physically removed. Allows recovery.' },
    { id: 'a3', title: 'UTC timezone for all timestamps', explanation: 'Standard engineering practice.' },
  ];

  const stageName = 'Stage ' + project.current_stage;
  const groups = getStubGroups(project.current_stage);

  function handleAnswer(_qId: string, _key: string, _free?: string) {
    if (questionIndex < stubQuestions.length - 1) {
      setQuestionIndex((i) => i + 1);
    } else {
      setCentreView('ASSUMED');
      setQuestionIndex(0);
    }
  }

  return (
    <div className='stage-runner'>
      <div className='stage-runner__header'>
        <h2 className='stage-runner__title'>{stageName}</h2>
        {view === 'RUNNING' && <span className='stage-runner__badge stage-runner__badge--running'>RUNNING ●</span>}
        {view === 'QUESTIONS' && <span className='stage-runner__badge stage-runner__badge--awaiting'>YOUR INPUT NEEDED ●</span>}
        {view === 'DEADLOCKED' && <span className='stage-runner__badge stage-runner__badge--error'>DEADLOCKED ✖</span>}
      </div>

      {view === 'RUNNING' && (
        <div className='stage-runner__groups'>
          {groups.map((g) => <IcGroupCard key={g.id} group={g} />)}
        </div>
      )}

      {view === 'CHECKPOINT_1' && <CheckpointBanner1 />}

      {view === 'QUESTIONS' && (
        <>
          <CheckpointBanner2 onReview={() => setCentreView('QUESTIONS')} />
          <FounderQuestion
            question={stubQuestions[questionIndex]}
            index={questionIndex}
            total={stubQuestions.length}
            onAnswer={handleAnswer}
          />
        </>
      )}

      {view === 'ASSUMED' && (
        <AssumedDecisions
          decisions={stubAssumed}
          onContinue={() => setCentreView('IDLE')}
        />
      )}

      {view === 'DEADLOCKED' && (
        <DeadlockBanner
          stageName={stageName}
          issue='Your team needs your input to resolve an ambiguous requirement.'
          options={[
            { key: 'A', text: 'Option A' },
            { key: 'B', text: 'Option B', recommended: true },
            { key: 'C', text: 'Option C' },
            { key: 'D', text: 'I have a different approach' },
          ]}
          onResolve={() => setCentreView('IDLE')}
        />
      )}

      {view === 'IDLE' && (
        <div className='stage-runner__idle'>
          <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>
            Stage {project.current_stage} — Ready to begin
          </h3>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: 'var(--color-text-secondary)', margin: '0 0 24px', lineHeight: 1.6 }}>
            Your idea has been validated by the Council. Click below to start Stage {project.current_stage} — your AI engineering team will begin work immediately.
          </p>
          {startError && (
            <p style={{ fontSize: '13px', color: 'var(--color-error)', marginBottom: '12px' }}>{startError}</p>
          )}
          <button
            onClick={handleStart}
            disabled={starting}
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '15px',
              fontWeight: 600,
              background: starting ? '#C084E8' : '#8C00B4',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 28px',
              cursor: starting ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {starting ? 'Starting…' : 'Start Stage ' + project.current_stage + ' →'}
          </button>
        </div>
      )}
    </div>
  );
}
