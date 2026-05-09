import type { StageRun } from '../../pages/app/WorkspacePage';

const STAGE_NAMES = ["P0  Idea Validation","P0.5  Feature Discovery","S1  Product Spec","S2  Architecture","S3  Data Architecture","S4  Backend & API","S5  Frontend & Client","S6  QA & Testing","S7  Security","S8  Infrastructure","S9  Performance","S10  Deployment","S11  Handover"];

interface Props {
  stageRuns: StageRun[];
  currentStage: number;
  progressPct: number;
}

function statusDot(status: string): { symbol: string; className: string } {
  switch (status) {
    case 'LOCKED':    return { symbol: '✓', className: 'dot--locked' };
    case 'RUNNING':   return { symbol: '▶', className: 'dot--running' };
    case 'AWAITING_FOUNDER': return { symbol: '●', className: 'dot--awaiting' };
    case 'DEADLOCKED':return { symbol: '✖', className: 'dot--error' };
    case 'ERROR':     return { symbol: '✖', className: 'dot--error' };
    case 'PENDING':   return { symbol: '□', className: 'dot--waiting' };
    case 'WAITING':   return { symbol: '□', className: 'dot--waiting' };
    default:          return { symbol: '□', className: 'dot--waiting' };
  }
}

export function PipelineSidebar({ stageRuns, currentStage, progressPct }: Props) {
  const pct = Math.min(100, Math.max(0, progressPct));

  return (
    <nav className='pipeline-sidebar'>
      <div className='pipeline-sidebar__header'>
        <span className='pipeline-sidebar__label'>PIPELINE</span>
        <span className='pipeline-sidebar__pct'>{pct}% complete</span>
      </div>

      <div className='pipeline-sidebar__bar'>
        <div className='pipeline-sidebar__bar-fill' style={{ width: pct + '%' }} />
      </div>

      <ol className='pipeline-sidebar__list'>
        {STAGE_NAMES.map((name, i) => {
          const run = stageRuns.find((sr) => sr.stage === i);
          const status = run?.status ?? 'WAITING';
          const dot = statusDot(status);
          const isActive = i === currentStage;
          return (
            <li
              key={i}
              className={'pipeline-sidebar__item' + (isActive ? ' pipeline-sidebar__item--active' : '')}
            >
              <span className={'pipeline-sidebar__dot ' + dot.className}>{dot.symbol}</span>
              <span className='pipeline-sidebar__name'>{name}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
