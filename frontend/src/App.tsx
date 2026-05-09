import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { SignupPage } from './pages/auth/SignupPage';
import { LoginPage } from './pages/auth/LoginPage';
import { MarketingHome } from './pages/marketing/MarketingHome';
import { PricingPage } from './pages/marketing/PricingPage';
import { AboutPage } from './pages/marketing/AboutPage';
import { AppShell } from './components/dashboard/AppShell';
import { DashboardPage } from './pages/app/DashboardPage';
import { NewProjectPage } from './pages/app/NewProjectPage';
import WorkspacePage from './pages/app/WorkspacePage';

// ProtectedRoute: if no linup_session cookie present, redirect to /login
// Full JWT + two_factor_verified enforcement happens server-side on every /api/* call
function ProtectedRoute() {
  const hasSession = document.cookie.includes('linup_session=');
  if (!hasSession) return <Navigate to='/login' replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Marketing routes — public, no auth required (Doc 8D Phase 3) */}
        <Route path='/' element={<MarketingHome />} />
        <Route path='/pricing' element={<PricingPage />} />
        <Route path='/about' element={<AboutPage />} />
        {/* Public auth routes (Phase 2) */}
        <Route path='/signup' element={<SignupPage />} />
        <Route path='/login' element={<LoginPage />} />
        {/* Protected app routes — AppShell wraps all /app/* (Phase 4) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path='/app' element={<DashboardPage />} />
            <Route path='/app/new' element={<NewProjectPage />} />
            {/* Phase 5 — Workspace (Doc 5 Screen 3) */}
            <Route path='/app/project/:id' element={<WorkspacePage />} />
          </Route>
        </Route>
        {/* Catch-all */}
        <Route path='*' element={<Navigate to='/' replace />} />
      </Routes>
    </BrowserRouter>
  );
}
