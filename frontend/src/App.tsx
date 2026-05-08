import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { SignupPage } from './pages/auth/SignupPage';
import { LoginPage } from './pages/auth/LoginPage';
import { MarketingHome } from './pages/marketing/MarketingHome';
import { PricingPage } from './pages/marketing/PricingPage';
import { AboutPage } from './pages/marketing/AboutPage';

// Placeholder until Phase 4 builds the real app shell
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
      <p>Dashboard — Phase 4 coming next.</p>
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
        {/* Marketing routes — public, no auth required (Doc 8D Phase 3) */}
        <Route path="/" element={<MarketingHome />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/about" element={<AboutPage />} />

        {/* Public auth routes (Phase 2) */}
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected app routes (Phase 4+) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/app/*" element={<AppShell />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}