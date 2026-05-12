import { useState } from 'react';
import { apiFetch } from '../../lib/api';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Plus, Settings, CreditCard, LogOut } from 'lucide-react';

// --- TopBar -------------------------------------------------------------------
function TopBar() {
  const navigate = useNavigate();
  const [logoFailed, setLogoFailed] = useState(false);

  async function handleLogout() {
    await apiFetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    navigate('/login', { replace: true });
  }

  return (
    <header style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      height: 'var(--topbar-height)',
      background: '#FFFFFF',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 var(--space-6)',
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        {logoFailed ? (
          <span style={{
            fontWeight: 800,
            fontSize: '15px',
            letterSpacing: '-0.03em',
            color: 'var(--color-brand)',
          }}>LINUP</span>
        ) : (
          <img
            src="/logo.png"
            alt="LINUP"
            style={{ height: '28px', width: 'auto', display: 'block', maxWidth: '120px' }}
            onError={() => setLogoFailed(true)}
          />
        )}
      </div>

      {/* Sign out */}
      <button
        onClick={handleLogout}
        title="Sign out"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          background: 'transparent',
          border: 'none',
          color: 'var(--color-text-secondary)',
          fontSize: '13px',
          cursor: 'pointer',
          padding: 'var(--space-2) var(--space-3)',
          borderRadius: 'var(--radius-md)',
          transition: 'background 120ms ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#F4F4F2')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <LogOut size={14} strokeWidth={1.5} />
        Sign out
      </button>
    </header>
  );
}

// --- Sidebar ------------------------------------------------------------------
const navLinkBase: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-3)',
  padding: 'var(--space-2) var(--space-4)',
  borderRadius: 'var(--radius-md)',
  fontSize: '13px',
  fontWeight: 500,
  color: 'var(--color-text-secondary)',
  textDecoration: 'none',
  transition: 'background 120ms ease, color 120ms ease',
  cursor: 'pointer',
};

function SidebarNavLink({ to, icon, label, end }: {
  to: string; icon: React.ReactNode; label: string; end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      style={({ isActive }) => ({
        ...navLinkBase,
        background: isActive ? '#F4F4F2' : 'transparent',
        color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
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
      left: 0, bottom: 0,
      width: 'var(--sidebar-width)',
      background: '#FFFFFF',
      borderRight: '1px solid var(--color-border)',
      display: 'flex',
      flexDirection: 'column',
      padding: 'var(--space-4) var(--space-3)',
      gap: 'var(--space-1)',
      overflowY: 'auto',
    }}>
      <div style={{
        fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em',
        color: 'var(--color-text-tertiary)',
        padding: 'var(--space-2) var(--space-4)',
        textTransform: 'uppercase', marginBottom: 'var(--space-1)',
      }}>Projects</div>

      <SidebarNavLink to="/app" end icon={<LayoutDashboard size={16} strokeWidth={1.5} />} label="Dashboard" />
      <SidebarNavLink to="/app/new" icon={<Plus size={16} strokeWidth={1.5} />} label="New project" />

      <div style={{ flex: 1 }} />

      <div style={{
        fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em',
        color: 'var(--color-text-tertiary)',
        padding: 'var(--space-2) var(--space-4)',
        textTransform: 'uppercase', marginBottom: 'var(--space-1)',
      }}>Account</div>

      <SidebarNavLink to="/app/settings" icon={<Settings size={16} strokeWidth={1.5} />} label="Settings" />
      <SidebarNavLink to="/app/billing" icon={<CreditCard size={16} strokeWidth={1.5} />} label="Billing" />
    </nav>
  );
}

// --- AppShell -----------------------------------------------------------------
export function AppShell() {
  return (
    <div style={{ width: '100%', height: '100vh', overflow: 'hidden', background: '#F9FAFB' }}>
      <TopBar />
      <Sidebar />
      <main style={{
        position: 'fixed',
        top: 'var(--topbar-height)',
        left: 'var(--sidebar-width)',
        right: 0, bottom: 0,
        overflowY: 'auto',
        background: '#F9FAFB',
        padding: 'var(--space-8)',
      }}>
        <Outlet />
      </main>
    </div>
  );
}