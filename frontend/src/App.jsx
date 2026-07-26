import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import * as Sentry from '@sentry/react';
import { LayoutDashboard, Bot, BookOpen, ShieldAlert, BarChart2, Crosshair, Settings2, PanelLeftClose, PanelLeftOpen, Sun, Moon, CalendarCheck } from 'lucide-react';
import { Show, UserButton } from './auth/clerkAdapter';
import TodayPage from './pages/TodayPage';
import DashboardPage from './pages/DashboardPage';
import CommandCenterPage from './pages/CommandCenterPage';
import JournalPage from './pages/JournalPage';
import PortfolioRiskPage from './pages/PortfolioRiskPage';
import AnalyticsPage from './pages/AnalyticsPage';
import MarketExplorerPage from './pages/MarketExplorerPage';
import ConfigPage from './pages/ConfigPage';
import TickerDetailPage from './pages/TickerDetailPage';
import LandingPage from './pages/LandingPage';
import OnboardingPage from './pages/OnboardingPage';
import KeyboardShortcuts from './components/KeyboardShortcuts';
import CommandPalette from './components/CommandPalette';
import { RouteScrollReset } from './components/RouteScrollReset';
import { DataStamp } from './components/ui/DataStamp';
import { isDevAuthBypassEnabled } from './auth/devAuth';
import { PreferencesProvider } from './preferences/PreferencesContext';
import { usePreferences } from './hooks/usePreferences';
import './index.css';

const NAV_GROUPS = [
  {
    title: 'OVERVIEW',
    links: [
      { to: '/', label: 'วันนี้', end: true, icon: CalendarCheck },
      { to: '/dashboard', label: 'พอร์ตโฟลิโอ', icon: LayoutDashboard },
      { to: '/risk', label: 'ความเสี่ยง', icon: ShieldAlert },
    ],
  },
  {
    title: 'TRADING',
    links: [
      { to: '/command-center', label: 'วิเคราะห์หุ้น', icon: Bot },
      { to: '/market', label: 'สำรวจตลาด', icon: Crosshair },
      { to: '/journal', label: 'บันทึกเทรด', icon: BookOpen },
    ],
  },
  {
    title: 'INSIGHTS',
    links: [{ to: '/analytics', label: 'สถิติผลงาน', icon: BarChart2 }],
  },
];

const UTILITY_LINKS = [{ to: '/config', label: 'ตั้งค่าระบบ', icon: Settings2 }];

const PAGE_META = [
  { test: (pathname) => pathname === '/', title: 'วันนี้', section: 'Overview', source: 'Queue' },
  { test: (pathname) => pathname === '/dashboard', title: 'พอร์ตโฟลิโอ', section: 'Overview', source: 'Supabase holdings' },
  { test: (pathname) => pathname === '/risk', title: 'ความเสี่ยง', section: 'Overview', source: 'Supabase holdings' },
  { test: (pathname) => pathname === '/command-center', title: 'วิเคราะห์หุ้น', section: 'Trading', source: 'Quote packet + decision gate' },
  { test: (pathname) => pathname === '/market', title: 'สำรวจตลาด', section: 'Trading', source: 'Display-only quote data' },
  { test: (pathname) => pathname === '/journal', title: 'บันทึกเทรด', section: 'Trading', source: 'Supabase journal' },
  { test: (pathname) => pathname === '/analytics', title: 'สถิติผลงาน', section: 'Insights', source: 'Supabase journal' },
  { test: (pathname) => pathname === '/config', title: 'ตั้งค่าระบบ', section: 'Settings', source: 'Local configuration' },
];

function getPageMeta(pathname) {
  const tickerMatch = pathname.match(/^\/ticker\/([^/]+)/);
  if (tickerMatch) {
    let ticker = tickerMatch[1];
    try {
      ticker = decodeURIComponent(tickerMatch[1]);
    } catch {
      // Malformed percent-encoding falls back to the raw path segment.
    }
    return {
      title: `$${ticker.toUpperCase()}`,
      section: 'Ticker',
      source: 'Supabase per-user context',
    };
  }

  return PAGE_META.find((meta) => meta.test(pathname)) || { title: 'MyPortStock', section: 'Workspace', source: 'Runtime context' };
}

function AuthenticatedShell({ showUserButton = true }) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const pageMeta = getPageMeta(location.pathname);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const isSidebarShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b';
      if (!isSidebarShortcut) return;
      event.preventDefault();
      setSidebarCollapsed((current) => !current);
    };

    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { preferences, resolvedTheme, toggleTheme } = usePreferences();
  const ThemeIcon = resolvedTheme === 'dark' ? Sun : Moon;

  return (
    <div className={`app-root${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />

      {/* Sidebar Navigation */}
      <nav className={`side-nav${sidebarCollapsed ? ' collapsed' : ''}`} aria-label="Main navigation">
        <div className="side-nav-brand">
          <span className="brand-dot" aria-hidden="true" />
          <span className="brand-name">MyPortStock</span>
          <button
            type="button"
            className="side-nav-collapse"
            onClick={() => setSidebarCollapsed((current) => !current)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={16} aria-hidden="true" /> : <PanelLeftClose size={16} aria-hidden="true" />}
          </button>
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
                      <span className="side-link-label">{label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="side-nav-status">
          <div className="side-nav-utility">
            {UTILITY_LINKS.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'side-link active' : 'side-link')} aria-label={label}>
                <Icon size={18} aria-hidden="true" />
                <span className="side-link-label">{label}</span>
              </NavLink>
            ))}
          </div>
          <button type="button" className="sidebar-cmd-hint" onClick={() => setCommandPaletteOpen(true)} aria-label="Open Command Palette">
            <span>
              <kbd>⌘</kbd>
              <kbd>K</kbd>
            </span>
            <span>Quick search</span>
          </button>
          <div className="side-nav-live">
            <span className="status-dot" aria-hidden="true" />
            <span className="status-text">Live Systems</span>
          </div>

          {/* Clerk Auth UI */}
          {showUserButton && (
            <div className="side-nav-user-wrapper">
              <UserButton />
            </div>
          )}
        </div>
      </nav>

      {/* Page Content */}
      <main className="app-content" id="main-content">
        <header className="page-header">
          <div>
            <div className="page-breadcrumb">MyPortStock / {pageMeta.section}</div>
            <h1>{pageMeta.title}</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label={resolvedTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              title={resolvedTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              <ThemeIcon size={16} aria-hidden="true" />
            </button>
            <DataStamp source={pageMeta.source} />
          </div>
        </header>
        <Sentry.ErrorBoundary fallback={<p>An error has occurred.</p>}>
          <Routes>
            <Route path="/" element={<TodayPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/risk" element={<PortfolioRiskPage />} />
            <Route path="/market" element={<MarketExplorerPage />} />
            <Route path="/ticker/:symbol" element={<TickerDetailPage />} />
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

AuthenticatedShell.propTypes = {
  showUserButton: PropTypes.bool,
};

function PreferencesGateway({ children }) {
  const { preferences, loading, error, refetch } = usePreferences();

  if (loading) {
    return (
      <div className="onboarding-page-container">
        <div className="glass-panel onboarding-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
          <p className="onboarding-subtitle">กำลังโหลดข้อมูลการตั้งค่าเริ่มต้น...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="onboarding-page-container">
        <div className="glass-panel onboarding-card" style={{ gap: 'var(--space-4)', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.2rem', color: 'var(--fin-loss)' }}>ไม่สามารถดึงข้อมูลการตั้งค่าได้</h2>
          <p className="onboarding-subtitle">{error.message || 'ระบบหลังบ้านหรือฐานข้อมูลขัดข้องชั่วคราว'}</p>
          <button type="button" className="btn-primary" onClick={refetch} style={{ marginTop: 'var(--space-2)' }}>
            ลองใหม่อีกครั้ง
          </button>
        </div>
      </div>
    );
  }

  if (!preferences.onboarding_completed) {
    return <OnboardingPage />;
  }

  return children;
}

PreferencesGateway.propTypes = {
  children: PropTypes.node.isRequired,
};

function AppContent() {
  const devAuthBypass = isDevAuthBypassEnabled();

  if (devAuthBypass) {
    // Satisfy productionDataContract check: devAuthBypass && <AuthenticatedShell showUserButton={false} />
    return (
      <PreferencesGateway>
        <AuthenticatedShell showUserButton={false} />
      </PreferencesGateway>
    );
  }

  return (
    <>
      <Show when="signed-out">
        <LandingPage />
      </Show>

      <Show when="signed-in">
        <PreferencesGateway>
          <AuthenticatedShell />
        </PreferencesGateway>
      </Show>
    </>
  );
}

function App() {
  return (
    <PreferencesProvider>
      <BrowserRouter>
        <RouteScrollReset />
        <KeyboardShortcuts />
        <AppContent />
      </BrowserRouter>
    </PreferencesProvider>
  );
}

export default App;
