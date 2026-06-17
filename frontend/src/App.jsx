import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { LayoutDashboard, Bot, BookOpen, ShieldAlert, BarChart2, Crosshair, Settings2 } from 'lucide-react';
import { Show, UserButton } from './auth/clerkAdapter';
import DashboardPage from './pages/DashboardPage';
import CommandCenterPage from './pages/CommandCenterPage';
import JournalPage from './pages/JournalPage';
import PortfolioRiskPage from './pages/PortfolioRiskPage';
import AnalyticsPage from './pages/AnalyticsPage';
import MarketExplorerPage from './pages/MarketExplorerPage';
import ConfigPage from './pages/ConfigPage';
import LandingPage from './pages/LandingPage';
import KeyboardShortcuts from './components/KeyboardShortcuts';
import { isDevAuthBypassEnabled } from './auth/devAuth';
import './index.css';

const NAV_GROUPS = [
  {
    title: 'OVERVIEW',
    links: [
      { to: '/', label: 'แดชบอร์ด', end: true, icon: LayoutDashboard },
      { to: '/risk', label: 'บริหารความเสี่ยง', icon: ShieldAlert },
      { to: '/market', label: 'ตลาดหุ้น', icon: Crosshair },
    ],
  },
  {
    title: 'EXECUTION',
    links: [
      { to: '/command-center', label: 'Command Center', icon: Bot },
      { to: '/journal', label: 'บันทึกการเทรด', icon: BookOpen },
    ],
  },
  {
    title: 'ANALYSIS',
    links: [{ to: '/analytics', label: 'วิเคราะห์ผลงาน', icon: BarChart2 }],
  },
  {
    title: 'SETTINGS',
    links: [{ to: '/config', label: 'ตั้งค่าระบบ', icon: Settings2 }],
  },
];

function AuthenticatedShell({ showUserButton = true }) {
  return (
    <div className="app-root">
      {/* Sidebar Navigation */}
      <nav className="side-nav" aria-label="Main navigation">
        <div className="side-nav-brand">
          <span className="brand-dot" aria-hidden="true" />
          <span className="brand-name">MyPortStock</span>
        </div>
        <div className="side-nav-links">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="nav-group">
              <div className="nav-group-title" id={`group-${group.title}`}>
                {group.title}
              </div>
              <ul aria-labelledby={`group-${group.title}`} className="nav-group-list">
                {group.links.map(({ to, label, end, icon: Icon }) => (
                  <li key={to}>
                    <NavLink to={to} end={end} className={({ isActive }) => (isActive ? 'side-link active' : 'side-link')} aria-label={label}>
                      <Icon size={18} aria-hidden="true" />
                      {label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="side-nav-status">
          <div className="status-indicator">
            <span className="status-dot" aria-hidden="true" />
            <span className="status-text">Live Systems</span>
          </div>

          {/* Clerk Auth UI */}
          {showUserButton && <UserButton />}
        </div>
      </nav>

      {/* Page Content */}
      <main className="app-content" id="main-content">
        <Sentry.ErrorBoundary fallback={<p>An error has occurred.</p>}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/risk" element={<PortfolioRiskPage />} />
            <Route path="/market" element={<MarketExplorerPage />} />
            <Route path="/command-center" element={<CommandCenterPage />} />
            <Route path="/journal" element={<JournalPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/config" element={<ConfigPage />} />
          </Routes>
        </Sentry.ErrorBoundary>
      </main>
    </div>
  );
}

function App() {
  const devAuthBypass = isDevAuthBypassEnabled();

  return (
    <BrowserRouter>
      <KeyboardShortcuts />
      {devAuthBypass && <AuthenticatedShell showUserButton={false} />}

      {!devAuthBypass && (
        <>
          <Show when="signed-out">
            <LandingPage />
          </Show>

          <Show when="signed-in">
            <AuthenticatedShell />
          </Show>
        </>
      )}
    </BrowserRouter>
  );
}

export default App;
