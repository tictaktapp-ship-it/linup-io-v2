import { apiFetch, clearAuth } from '../../lib/api';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Plus, Settings, CreditCard, LogOut } from 'lucide-react';

// ─── TopBar ──────────────────────────────────────────────────────────────────
function TopBar() {
  const navigate = useNavigate();

  async function handleLogout() {
    await apiFetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    navigate('/login', { replace: true });
  }

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: 'var(--topbar-height)',
      background: 'var(--color-dark-1)',
      borderBottom: '1px solid var(--color-border-dark)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 var(--space-6)',
      zIndex: 100,
    }}>
      {/* Logo + wordmark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <span style={{
          fontFamily: 'var(--font-sans)',
          fontWeight: 700,
          fontSize: '15px',
          letterSpacing: '-0.03em',
          background: 'var(--color-brand-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>LINUP</span>
      </div>

      {/* Avatar menu — logout only for now */}
      <button
        onClick={handleLogout}
        title="Sign out"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          background: 'transparent',
          border: 'none',
          color: 'var(--color-text-on-dark-2)',
          fontSize: '13px',
          cursor: 'pointer',
          padding: 'var(--space-2) var(--space-3)',
          borderRadius: 'var(--radius-md)',
          transition: 'background 120ms ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-dark-2)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <LogOut size={14} strokeWidth={1.5} />
        Sign out
      </button>
    </header>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
const navLinkBase: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-3)',
  padding: 'var(--space-2) var(--space-4)',
  borderRadius: 'var(--radius-md)',
  fontSize: '13px',
  fontWeight: 500,
  color: 'var(--color-text-on-dark-2)',
  textDecoration: 'none',
  transition: 'background 120ms ease, color 120ms ease',
  cursor: 'pointer',
};

function SidebarNavLink({ to, icon, label, end }: {
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      style={({ isActive }) => ({
        ...navLinkBase,
        background: isActive ? 'var(--color-dark-2)' : 'transparent',
        color: isActive ? 'var(--color-text-on-dark)' : 'var(--color-text-on-dark-2)',
      })}
    >
      {icon}
      {label}
    </NavLink>
  );
}

function Sidebar() {
  return (
    <nav style={{
      position: 'fixed',
      top: 'var(--topbar-height)',
      left: 0,
      bottom: 0,
      width: 'var(--sidebar-width)',
      background: 'var(--color-dark-1)',
      borderRight: '1px solid var(--color-border-dark)',
      display: 'flex',
      flexDirection: 'column',
      padding: 'var(--space-4) var(--space-3)',
      gap: 'var(--space-1)',
      overflowY: 'auto',
    }}>
      {/* Section: Projects */}
      <div style={{
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.06em',
        color: 'var(--color-text-on-dark-2)',
        padding: 'var(--space-2) var(--space-4)',
        textTransform: 'uppercase',
        marginBottom: 'var(--space-1)',
      }}>Projects</div>

      <SidebarNavLink
        to="/app"
        end
        icon={<LayoutDashboard size={16} strokeWidth={1.5} />}
        label="Dashboard"
      />
      <SidebarNavLink
        to="/app/new"
        icon={<Plus size={16} strokeWidth={1.5} />}
        label="New project"
      />

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Section: Account */}
      <div style={{
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.06em',
        color: 'var(--color-text-on-dark-2)',
        padding: 'var(--space-2) var(--space-4)',
        textTransform: 'uppercase',
        marginBottom: 'var(--space-1)',
      }}>Account</div>

      <SidebarNavLink
        to="/app/settings"
        icon={<Settings size={16} strokeWidth={1.5} />}
        label="Settings"
      />
      <SidebarNavLink
        to="/app/billing"
        icon={<CreditCard size={16} strokeWidth={1.5} />}
        label="Billing"
      />
    </nav>
  );
}

// ─── AppShell ─────────────────────────────────────────────────────────────────
export function AppShell() {
  return (
    <div style={{
      width: '100%',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--color-dark-0)',
    }}>
      <TopBar />
      <Sidebar />
      {/* Main content — offset by topbar height and sidebar width */}
      <main style={{
        position: 'fixed',
        top: 'var(--topbar-height)',
        left: 'var(--sidebar-width)',
        right: 0,
        bottom: 0,
        overflowY: 'auto',
        background: 'var(--color-dark-0)',
        padding: 'var(--space-8)',
      }}>
        <Outlet />
      </main>
    </div>
  );
}