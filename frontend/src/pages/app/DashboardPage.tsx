import { useEffect, useState } from 'react';
import { apiFetch, clearAuth } from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2, AlertCircle } from 'lucide-react';

// --- Types -------------------------------------------------------------------
type ProjectStatus = 'RUNNING' | 'AWAITING_FOUNDER' | 'COMPLETE' | 'PAUSED' | 'ERROR';

interface Project {
  id: string;
  name: string;
  description: string | null;
  current_stage: number;
  status: ProjectStatus;
  progress_pct: number;
  updated_at: string;
}

interface ActivityEvent {
  id: string;
  project_id: string;
  project_name: string;
  type: 'STAGE_COMPLETE' | 'INPUT_NEEDED' | 'STAGE_STARTED';
  stage: number;
  created_at: string;
}

// --- Helpers -----------------------------------------------------------------
const STAGE_LABELS: Record<number, string> = {
  0:  'Idea Validation',
  1:  'Feature Discovery',
  2:  'Product Spec',
  3:  'Architecture',
  4:  'Data Architecture',
  5:  'Backend & API',
  6:  'Frontend & Client',
  7:  'QA & Testing',
  8:  'Security',
  9:  'Infrastructure',
  10: 'Performance',
  11: 'Deployment',
  12: 'Handover',
};

function statusDot(status: ProjectStatus): { color: string; label: string; pulse: boolean } {
  switch (status) {
    case 'RUNNING':          return { color: '#0284C7', label: 'AI team is working',  pulse: false };
    case 'AWAITING_FOUNDER': return { color: '#B45309', label: 'Your input needed',   pulse: true  };
    case 'COMPLETE':         return { color: '#2D6A4F', label: 'All stages locked',   pulse: false };
    case 'PAUSED':           return { color: '#8A8A82', label: 'Paused',              pulse: false };
    default:                 return { color: '#DC2626', label: 'Error',               pulse: false };
  }
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return hrs + 'h ago';
  return Math.floor(hrs / 24) + 'd ago';
}

// --- ProjectTile -------------------------------------------------------------
function ProjectTile({ project, onDelete }: { project: Project; onDelete: (id: string) => void }) {
  const navigate = useNavigate();
  const dot = statusDot(project.status);
  const stageLabel = STAGE_LABELS[project.current_stage] ?? 'Stage ' + project.current_stage;

  return (
    <div
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('[data-delete]')) return;
        navigate('/app/project/' + project.id);
      }}
      style={{
        background: '#FFFFFF',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-6)',
        cursor: 'pointer',
        transition: 'border-color 120ms ease, box-shadow 120ms ease',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        boxShadow: 'var(--shadow-subtle)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-brand)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-medium)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-subtle)';
      }}
    >
      {/* Project name */}
      <div style={{
        fontSize: '15px',
        fontWeight: 600,
        color: 'var(--color-text-primary)',
        letterSpacing: '-0.01em',
      }}>{project.name}</div>

      {/* Stage label */}
      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
        Stage {project.current_stage} — {stageLabel}
      </div>

      {/* Progress bar */}
      <div style={{
        height: '4px',
        background: '#EBEBEA',
        borderRadius: 'var(--radius-pill)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: project.progress_pct + '%',
          background: 'var(--color-brand)',
          borderRadius: 'var(--radius-pill)',
          transition: 'width 400ms ease',
        }} />
      </div>
      <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
        {project.progress_pct}% complete
      </div>

      {/* Status row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: dot.color,
          flexShrink: 0,
          animation: dot.pulse ? 'pulse 1.5s ease-in-out infinite' : 'none',
        }} />
        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{dot.label}</span>
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
          {relativeTime(project.updated_at)}
        </span>
      </div>

      {/* Delete */}
      <button
        data-delete
        onClick={(e) => {
          e.stopPropagation();
          if (window.confirm('Delete this project? This cannot be undone.')) onDelete(project.id);
        }}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--color-text-tertiary)',
          fontSize: '11px',
          cursor: 'pointer',
          textAlign: 'left',
          padding: 0,
          marginTop: 'var(--space-1)',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-error)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-tertiary)')}
      >
        Delete project
      </button>
    </div>
  );
}

// --- EmptyDashboard ----------------------------------------------------------
function EmptyDashboard() {
  const navigate = useNavigate();
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '400px',
      gap: 'var(--space-6)',
      textAlign: 'center',
    }}>
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: 'var(--radius-xl)',
        background: '#F4F4F2',
        border: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Plus size={32} strokeWidth={1.5} color="var(--color-brand)" />
      </div>
      <div>
        <div style={{
          fontSize: '18px',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--space-2)',
        }}>Start your first project</div>
        <div style={{
          fontSize: '14px',
          color: 'var(--color-text-secondary)',
          maxWidth: '360px',
          lineHeight: 1.6,
        }}>
          Your AI engineering department is ready. Create a project and your team will specify your product end-to-end.
        </div>
      </div>
      <button
        onClick={() => navigate('/app/new')}
        style={{
          height: '44px',
          padding: '0 var(--space-8)',
          background: 'var(--color-brand)',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: 'var(--radius-lg)',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'background 120ms ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-brand-hover)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-brand)')}
      >
        Create your first project
      </button>
    </div>
  );
}

// --- ActivityFeed ------------------------------------------------------------
function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) return null;

  function eventLabel(e: ActivityEvent): string {
    const stage = STAGE_LABELS[e.stage] ?? 'Stage ' + e.stage;
    switch (e.type) {
      case 'STAGE_COMPLETE': return 'Stage ' + stage + ' — ' + e.project_name + ' completed';
      case 'INPUT_NEEDED':   return 'Your input needed: ' + e.project_name;
      case 'STAGE_STARTED':  return 'Stage ' + stage + ' — ' + e.project_name + ' started';
      default:               return e.project_name;
    }
  }

  function eventDotColor(type: ActivityEvent['type']): string {
    switch (type) {
      case 'STAGE_COMPLETE': return '#2D6A4F';
      case 'INPUT_NEEDED':   return '#B45309';
      case 'STAGE_STARTED':  return '#0284C7';
      default:               return 'var(--color-text-tertiary)';
    }
  }

  return (
    <div style={{ marginTop: 'var(--space-10)' }}>
      <div style={{
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.06em',
        color: 'var(--color-text-tertiary)',
        textTransform: 'uppercase',
        marginBottom: 'var(--space-4)',
      }}>Recent activity</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {events.map(e => (
          <div key={e.id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            fontSize: '13px',
            color: 'var(--color-text-secondary)',
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: eventDotColor(e.type),
              flexShrink: 0,
            }} />
            <span style={{ flex: 1 }}>{eventLabel(e)}</span>
            <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', flexShrink: 0 }}>
              {relativeTime(e.created_at)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- DashboardPage -----------------------------------------------------------
export function DashboardPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch('/api/projects');
        if (res.status === 401) { clearAuth(); navigate('/login', { replace: true }); return; }
        if (!res.ok) throw new Error('Failed to load projects');
        const data = await res.json();
        setProjects(data.projects ?? []);
        setActivity(data.activity ?? []);
      } catch {
        setError('Could not load your projects. Please refresh.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [navigate]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        gap: 'var(--space-3)',
        color: 'var(--color-text-secondary)',
        fontSize: '14px',
      }}>
        <Loader2 size={16} strokeWidth={1.5} style={{ animation: 'spin 1s linear infinite' }} />
        Loading projects…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        gap: 'var(--space-3)',
        color: 'var(--color-error)',
        fontSize: '14px',
      }}>
        <AlertCircle size={16} strokeWidth={1.5} />
        {error}
      </div>
    );
  }

  async function handleDelete(id: string) {
    try {
      const res = await apiFetch('/api/projects/' + id, { method: 'DELETE', credentials: 'include' });
      if (res.status === 409) {
        const body = await res.json().catch(() => ({}));
        if (body.code === 'ARTIFACTS_DOWNLOADED') {
          alert('This project cannot be deleted because artifacts have already been downloaded. Projects with downloaded artifacts are kept for your records.');
          return;
        }
      }
      if (!res.ok) {
        alert('Failed to delete project. Please try again.');
        return;
      }
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch {
      alert('Could not reach the server. Please check your connection.');
    }
  }

  return (
    <div>
      {/* Page header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--space-8)',
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.02em',
        }}>Projects</h1>
        <button
          onClick={() => navigate('/app/new')}
          style={{
            height: '36px',
            padding: '0 var(--space-4)',
            background: 'var(--color-brand)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 'var(--radius-lg)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            transition: 'background 120ms ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-brand-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-brand)')}
        >
          <Plus size={14} strokeWidth={1.5} />
          New project
        </button>
      </div>

      {projects.length === 0 ? (
        <EmptyDashboard />
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 'var(--space-4)',
          }}>
            {projects.map(p => (
              <ProjectTile key={p.id} project={p} onDelete={handleDelete} />
            ))}
          </div>
          <ActivityFeed events={activity} />
        </>
      )}

      <style>{`
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes spin  { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
      `}</style>
    </div>
  );
}