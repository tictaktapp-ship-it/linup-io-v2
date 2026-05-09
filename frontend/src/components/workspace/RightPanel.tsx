import type { Project, StageRun } from '../../pages/app/WorkspacePage';

interface Props {
  project: Project;
  stageRuns: StageRun[];
}

// ── DownloadPanel ────────────────────────────────────────────────────────
// Three states per Doc 5 Screen 3: Free/first, Free/subsequent, Pro
// State is determined server-side; we receive it as a prop.
// No cost data shown — only payment prompts where applicable.
type DownloadState = 'FREE_FIRST' | 'FREE_SUBSEQUENT' | 'PRO';

function DownloadPanel({ projectId, downloadState }: { projectId: string; downloadState: DownloadState }) {
  return (
    <div className='download-panel'>
      <p className='download-panel__title'>DOWNLOADS</p>

      <div className='download-panel__item'>
        <span className='download-panel__label'>Specification PDF</span>
        <span className='download-panel__tag download-panel__tag--free'>FREE</span>
        <button className='btn btn--sm btn--ghost'>Download PDF</button>
      </div>

      <div className='download-panel__item'>
        <span className='download-panel__label'>App Package</span>
        {downloadState === 'FREE_FIRST' && (
          <button className='btn btn--sm btn--primary'>Unlock for £199</button>
        )}
        {downloadState === 'FREE_SUBSEQUENT' && (
          <button className='btn btn--sm btn--primary'>£10 per artifact</button>
        )}
        {downloadState === 'PRO' && (
          <button className='btn btn--sm btn--ghost'>Download — Included</button>
        )}
      </div>
    </div>
  );
}

// ── RightPanel ───────────────────────────────────────────────────────────
export function RightPanel({ project, stageRuns }: Props) {
  const lockedCount = stageRuns.filter((sr) => sr.status === 'LOCKED').length;

  // Stub health data (replaced by API data in Phase 6)
  const health = { decisions: 8, contradictions: 0, missed: 0, assumptions: 3 };

  // Stub recent decisions (replaced by API data in Phase 6)
  const recentDecisions = [
    { id: 'd1', question: 'How should old data be handled?', answer: 'Keep indefinitely (you answered)' },
    { id: 'd2', question: 'UUID format for keys?', answer: 'UUID v4 (team assumed)' },
  ];

  // Download state: derive from org plan (stub FREE_FIRST — Phase 7 wires real state)
  const downloadState: DownloadState = 'FREE_FIRST';

  return (
    <div className='right-panel'>

      {/* Stage Health */}
      <section className='right-panel__section'>
        <p className='right-panel__section-title'>STAGE HEALTH</p>
        <ul className='stage-health'>
          <li className='stage-health__item stage-health__item--ok'>
            <span>✓</span><span>{health.decisions} decisions made</span>
          </li>
          <li className={'stage-health__item ' + (health.contradictions > 0 ? 'stage-health__item--warn' : 'stage-health__item--ok')}>
            <span>{health.contradictions > 0 ? '⚠' : '✓'}</span>
            <span>{health.contradictions} contradictions found</span>
          </li>
          <li className={'stage-health__item ' + (health.missed > 0 ? 'stage-health__item--warn' : 'stage-health__item--ok')}>
            <span>{health.missed > 0 ? '⚠' : '✓'}</span>
            <span>{health.missed} requirements missed</span>
          </li>
          <li className={'stage-health__item ' + (health.assumptions > 0 ? 'stage-health__item--warn' : 'stage-health__item--ok')}>
            <span>{health.assumptions > 0 ? '⚠' : '✓'}</span>
            <span>{health.assumptions} team assumptions</span>
          </li>
        </ul>
      </section>

      {/* Recent Decisions */}
      <section className='right-panel__section'>
        <p className='right-panel__section-title'>RECENT DECISIONS</p>
        {recentDecisions.length === 0 && (
          <p className='right-panel__empty'>No decisions recorded yet.</p>
        )}
        {recentDecisions.map((d) => (
          <div key={d.id} className='recent-decision'>
            <p className='recent-decision__q'>Q: {d.question}</p>
            <p className='recent-decision__a'>A: {d.answer}</p>
          </div>
        ))}
        <a className='right-panel__link' href={'/app/project/' + project.id + '/decisions'}>View all decisions →</a>
      </section>

      {/* Downloads */}
      <section className='right-panel__section'>
        <DownloadPanel projectId={project.id} downloadState={downloadState} />
      </section>

      {/* Change Requests */}
      <section className='right-panel__section'>
        <p className='right-panel__section-title'>CHANGE REQUESTS</p>
        <button className='btn btn--ghost btn--sm'>+ Raise a change request</button>
        <p className='right-panel__empty'>0 open CRPs</p>
      </section>

      {/* Stages complete counter — no cost data */}
      <p className='right-panel__stages-note'>{lockedCount} of 13 stages complete</p>

    </div>
  );
}
