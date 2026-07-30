import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router';
import PropTypes from 'prop-types';
import * as Sentry from '@sentry/react';
import {
  LayoutDashboard,
  Bot,
  BookOpen,
  ShieldAlert,
  BarChart2,
  Crosshair,
  Settings2,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  CalendarCheck,
} from 'lucide-react';
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
import { useTranslation } from './i18n/useTranslation';
import { cn } from './lib/utils';
import './index.css';

const NAV_GROUPS = [
  {
    title: 'OVERVIEW',
    links: [
      { to: '/', labelKey: 'nav.today', end: true, icon: CalendarCheck },
      { to: '/dashboard', labelKey: 'nav.portfolio', icon: LayoutDashboard },
      { to: '/risk', labelKey: 'nav.risk', icon: ShieldAlert },
    ],
  },
  {
    title: 'TRADING',
    links: [
      { to: '/command-center', labelKey: 'nav.command_center', icon: Bot },
      { to: '/market', labelKey: 'nav.market_explorer', icon: Crosshair },
      { to: '/journal', labelKey: 'nav.journal', icon: BookOpen },
    ],
  },
  {
    title: 'INSIGHTS',
    links: [{ to: '/analytics', labelKey: 'nav.analytics', icon: BarChart2 }],
  },
];

const UTILITY_LINKS = [{ to: '/config', labelKey: 'nav.config', icon: Settings2 }];

const PAGE_META = [
  { test: (pathname) => pathname === '/', titleKey: 'nav.today', section: 'Overview', source: 'Queue' },
  { test: (pathname) => pathname === '/dashboard', titleKey: 'nav.portfolio', section: 'Overview', source: 'Supabase holdings' },
  { test: (pathname) => pathname === '/risk', titleKey: 'nav.risk', section: 'Overview', source: 'Supabase holdings' },
  { test: (pathname) => pathname === '/command-center', titleKey: 'nav.command_center', section: 'Trading', source: 'Quote packet + decision gate' },
  { test: (pathname) => pathname === '/market', titleKey: 'nav.market_explorer', section: 'Trading', source: 'Display-only quote data' },
  { test: (pathname) => pathname === '/journal', titleKey: 'nav.journal', section: 'Trading', source: 'Supabase journal' },
  { test: (pathname) => pathname === '/analytics', titleKey: 'nav.analytics', section: 'Insights', source: 'Supabase journal' },
  { test: (pathname) => pathname === '/config', titleKey: 'nav.config', section: 'Settings', source: 'Local configuration' },
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
  const { t } = useTranslation();

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

  const { preferences, savePreferences, resolvedTheme, toggleTheme } = usePreferences();
  const ThemeIcon = resolvedTheme === 'dark' ? Sun : Moon;

  return (
    <div className="flex min-h-screen flex-row bg-background text-foreground" data-ui-contract="app-root">
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />

      {/* Sidebar Navigation */}
      <nav
        className={cn(
          'sticky top-0 z-30 flex h-screen w-[var(--nav-width)] flex-col border-r border-border bg-shell px-5 py-6 max-[768px]:fixed max-[768px]:inset-x-0 max-[768px]:bottom-0 max-[768px]:top-auto max-[768px]:z-40 max-[768px]:h-[calc(72px+env(safe-area-inset-bottom))] max-[768px]:w-full max-[768px]:flex-row max-[768px]:items-center max-[768px]:overflow-x-auto max-[768px]:border-r-0 max-[768px]:border-t max-[768px]:px-2.5 max-[768px]:pb-[calc(6px+env(safe-area-inset-bottom))] max-[768px]:pt-1.5',
          sidebarCollapsed && 'w-[76px] px-3 py-5'
        )}
        aria-label="Main navigation"
        data-ui-contract="side-nav"
        data-collapsed={sidebarCollapsed}
      >
        <div className={cn('mb-10 flex items-center gap-3 px-3 max-[768px]:hidden', sidebarCollapsed && 'mb-7 justify-center px-0')}>
          <span className={cn('flex size-6 items-center justify-center rounded-md bg-brand', sidebarCollapsed && 'size-7')} aria-hidden="true">
            <span className="size-3 rounded-sm bg-background" />
          </span>
          <span className={cn('text-[1.1rem] font-bold tracking-[-0.3px] text-foreground', sidebarCollapsed && 'hidden')}>MyPortStock</span>
          <button
            type="button"
            className={cn(
              'ml-auto inline-flex size-[30px] items-center justify-center rounded-md border border-border bg-surface text-text-secondary outline-none hover:border-border-strong hover:text-foreground focus-visible:border-border-strong focus-visible:text-foreground',
              sidebarCollapsed && 'ml-0'
            )}
            onClick={() => setSidebarCollapsed((current) => !current)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={16} aria-hidden="true" /> : <PanelLeftClose size={16} aria-hidden="true" />}
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-1 max-[768px]:min-w-0 max-[768px]:flex-row max-[768px]:items-center max-[768px]:overflow-x-auto">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className={cn('mb-6 max-[768px]:m-0 max-[768px]:shrink-0', sidebarCollapsed && 'mb-3.5')}>
              <div
                className={cn(
                  'mb-2 pl-3 text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-text-secondary max-[768px]:hidden',
                  sidebarCollapsed && 'hidden'
                )}
                id={`group-${group.title}`}
              >
                {group.title}
              </div>
              <ul aria-labelledby={`group-${group.title}`} className="m-0 list-none p-0 max-[768px]:flex max-[768px]:items-center max-[768px]:gap-1">
                {group.links.map(({ to, labelKey, end, icon: Icon }) => {
                  const label = t(labelKey);
                  return (
                    <li key={to}>
                      <NavLink
                        to={to}
                        end={end}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-3 rounded-sm px-3.5 py-2.5 text-sm font-medium text-text-secondary no-underline transition-colors hover:bg-panel-hover hover:text-foreground max-[768px]:min-h-11 max-[768px]:min-w-16 max-[768px]:flex-col max-[768px]:justify-center max-[768px]:gap-1 max-[768px]:px-2 max-[768px]:py-1.5 max-[768px]:text-center max-[768px]:text-xs',
                            isActive && 'border border-brand bg-brand-dim text-foreground',
                            sidebarCollapsed && 'justify-center px-3 py-[11px]'
                          )
                        }
                        aria-label={label}
                      >
                        <Icon size={18} aria-hidden="true" />
                        <span className={cn(sidebarCollapsed && 'hidden max-[768px]:inline')}>{label}</span>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        <div
          className={cn(
            'mt-auto flex flex-col items-stretch gap-3 border-t border-border px-3 py-4 max-[768px]:m-0 max-[768px]:shrink-0 max-[768px]:border-0 max-[768px]:p-0',
            sidebarCollapsed && 'px-0'
          )}
        >
          <div className="grid gap-2 max-[768px]:flex max-[768px]:items-center max-[768px]:gap-1">
            {UTILITY_LINKS.map(({ to, labelKey, icon: Icon }) => {
              const label = t(labelKey);
              return (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-sm px-3.5 py-2.5 text-sm font-medium text-text-secondary no-underline transition-colors hover:bg-panel-hover hover:text-foreground max-[768px]:min-h-11 max-[768px]:min-w-16 max-[768px]:flex-col max-[768px]:justify-center max-[768px]:gap-1 max-[768px]:px-2 max-[768px]:py-1.5 max-[768px]:text-center max-[768px]:text-xs',
                      isActive && 'border border-brand bg-brand-dim text-foreground',
                      sidebarCollapsed && 'justify-center px-3 py-[11px]'
                    )
                  }
                  aria-label={label}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span className={cn(sidebarCollapsed && 'hidden max-[768px]:inline')}>{label}</span>
                </NavLink>
              );
            })}
          </div>
          <button
            type="button"
            className={cn(
              'flex w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-border bg-surface p-2 text-[0.78rem] text-text-secondary outline-none hover:border-border-strong hover:text-foreground focus-visible:border-border-strong focus-visible:text-foreground max-[768px]:hidden',
              sidebarCollapsed && 'justify-center'
            )}
            onClick={() => setCommandPaletteOpen(true)}
            aria-label="Open Command Palette"
          >
            <span className="inline-flex items-center gap-1">
              <kbd className="min-w-[22px] rounded border border-border bg-surface-raised px-[5px] py-1 text-center font-mono text-[0.7rem] leading-none">
                ⌘
              </kbd>
              <kbd className="min-w-[22px] rounded border border-border bg-surface-raised px-[5px] py-1 text-center font-mono text-[0.7rem] leading-none">
                K
              </kbd>
            </span>
            <span className={cn(sidebarCollapsed && 'hidden')}>{t('nav.quick_search')}</span>
          </button>
          <div className={cn('flex items-center gap-2 max-[768px]:hidden', sidebarCollapsed && 'justify-center')}>
            <span className="size-2 rounded-full bg-fin-profit" aria-hidden="true" />
            <span className={cn('text-xs font-medium text-text-secondary', sidebarCollapsed && 'hidden')}>Live Systems</span>
          </div>

          {/* Clerk Auth UI */}
          {showUserButton && (
            <div className={cn('mt-1 flex items-center px-3 py-1 max-[768px]:hidden', sidebarCollapsed && 'justify-center px-0')}>
              <UserButton />
            </div>
          )}
        </div>
      </nav>

      {/* Page Content */}
      <main
        className="flex h-screen min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-transparent max-[768px]:h-auto max-[768px]:min-h-screen max-[768px]:w-full max-[768px]:overflow-x-hidden max-[768px]:overflow-y-visible max-[768px]:pb-[calc(72px+env(safe-area-inset-bottom))]"
        id="main-content"
        data-ui-contract="app-content"
      >
        <header className="flex min-h-[76px] shrink-0 items-center justify-between gap-4 border-b border-border bg-shell px-7 py-4 max-[768px]:min-h-[68px] max-[768px]:flex-col max-[768px]:items-start max-[768px]:px-4 max-[768px]:py-3.5">
          <div>
            <div className="mb-1 font-mono text-xs uppercase text-text-secondary">MyPortStock / {pageMeta.section}</div>
            <h1 className="m-0 text-[1.35rem] leading-[1.2] tracking-normal text-foreground">
              {pageMeta.titleKey ? t(pageMeta.titleKey) : pageMeta.title}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex min-h-8 min-w-8 cursor-pointer items-center justify-center rounded border border-border bg-surface px-2 text-xs font-mono font-bold text-foreground transition-transform hover:scale-[1.06] hover:border-border-hover hover:bg-surface-hover active:scale-95 max-[768px]:min-h-11 max-[768px]:min-w-11"
              onClick={() => savePreferences({ language: (preferences?.language || 'th') === 'th' ? 'en' : 'th' })}
              aria-label={(preferences?.language || 'th') === 'th' ? 'Switch to English' : 'Switch to Thai'}
              title={(preferences?.language || 'th') === 'th' ? 'Switch to English' : 'Switch to Thai'}
            >
              {(preferences?.language || 'th').toUpperCase()}
            </button>
            <button
              type="button"
              className="flex size-8 cursor-pointer items-center justify-center rounded border border-border bg-surface text-foreground transition-transform hover:rotate-[15deg] hover:scale-[1.06] hover:border-border-hover hover:bg-surface-hover active:scale-95 motion-reduce:transform-none max-[768px]:size-11"
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
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="flex min-h-[200px] w-full max-w-xl items-center justify-center rounded-lg border border-border bg-panel p-6">
          <p className="text-text-secondary">{t('common.preferences_loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="grid w-full max-w-xl gap-4 rounded-lg border border-border bg-panel p-6 text-center">
          <h2 className="text-xl text-fin-loss">{t('common.preferences_load_error')}</h2>
          <p className="text-text-secondary">{error.message || t('common.backend_unavailable')}</p>
          <button type="button" className="mt-2 rounded-md bg-brand px-4 py-2 font-semibold text-text-inverse" onClick={refetch}>
            {t('common.retry')}
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
