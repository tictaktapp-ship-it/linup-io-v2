import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { SignupPage } from './pages/auth/SignupPage';
import { LoginPage } from './pages/auth/LoginPage';

// Placeholder until Phase 3/4 builds the real app shell
function AppShell() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-dark-0)',
      color: 'var(--color-surface-0)',
      fontFamily: 'var(--font-sans)',
      fontSize: '16px',
    }}>
      <p>App shell — Phase 3 coming next.</p>
    </div>
  );
}

// ProtectedRoute: if no linup_session cookie present, redirect to /login
// Full JWT + two_factor_verified enforcement happens server-side on every /api/* call
function ProtectedRoute() {
  const hasSession = document.cookie.includes('linup_session=');
  if (!hasSession) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public auth routes */}
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected app routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/app/*" element={<AppShell />} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}