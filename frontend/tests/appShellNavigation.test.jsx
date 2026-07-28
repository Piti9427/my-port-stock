import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import App from '../src/App.jsx';

const root = resolve(__dirname, '..');
const read = (file) => readFileSync(resolve(root, file), 'utf8');

vi.mock('@sentry/react', () => ({
  ErrorBoundary: ({ children }) => children,
}));

vi.mock('../src/auth/devAuth', () => ({
  isDevAuthBypassEnabled: () => true,
  shouldUseClerkProvider: () => false,
}));

vi.mock('../src/components/CommandPalette', () => ({
  default: ({ open }) => (open ? <div role="dialog" aria-label="Command Palette" /> : null),
}));

vi.mock('../src/pages/TodayPage', () => ({ default: () => <div>Today Route</div> }));
vi.mock('../src/pages/DashboardPage', () => ({ default: () => <div>Dashboard Route</div> }));
vi.mock('../src/pages/CommandCenterPage', () => ({ default: () => <div>Command Center Route</div> }));
vi.mock('../src/pages/JournalPage', () => ({ default: () => <div>Journal Route</div> }));
vi.mock('../src/pages/PortfolioRiskPage', () => ({ default: () => <div>Risk Route</div> }));
vi.mock('../src/pages/AnalyticsPage', () => ({ default: () => <div>Analytics Route</div> }));
vi.mock('../src/pages/MarketExplorerPage', () => ({ default: () => <div>Market Route</div> }));
vi.mock('../src/pages/ConfigPage', () => ({ default: () => <div>Config Route</div> }));
vi.mock('../src/pages/TickerDetailPage', () => ({ default: () => <div>Ticker Route</div> }));
vi.mock('../src/pages/LandingPage', () => ({ default: () => <div>Landing Route</div> }));

test('authenticated shell groups navigation, keeps config as utility, and exposes page header', () => {
  render(<App />);

  const nav = screen.getByRole('navigation', { name: /Main navigation/i });

  expect(screen.getByText('OVERVIEW')).toBeInTheDocument();
  expect(screen.getByText('TRADING')).toBeInTheDocument();
  expect(screen.getByText('INSIGHTS')).toBeInTheDocument();
  expect(screen.queryByText('SETTINGS')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: /ตั้งค่าระบบ/i })).toHaveAttribute('href', '/config');
  expect(screen.getByRole('heading', { level: 1, name: 'วันนี้' })).toBeInTheDocument();
  expect(screen.getByText(/Queue/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Collapse sidebar/i }));
  expect(nav).toHaveAttribute('data-collapsed', 'true');
  expect(screen.getByRole('button', { name: /Expand sidebar/i })).toBeInTheDocument();

  fireEvent.keyDown(window, { key: 'b', metaKey: true });
  expect(nav).toHaveAttribute('data-collapsed', 'false');
});

test('authenticated route pages do not create nested main landmarks inside the app shell', () => {
  const authenticatedPages = [
    'src/pages/DashboardPage.jsx',
    'src/pages/CommandCenterPage.jsx',
    'src/pages/ConfigPage.jsx',
    'src/pages/MarketExplorerPage.jsx',
    'src/pages/TickerDetailPage.jsx',
  ];

  for (const page of authenticatedPages) {
    expect(read(page), `${page} should let App.jsx own the main landmark`).not.toMatch(/<\/?main[\s>]/);
  }
});

test('mobile shell uses Tailwind bottom navigation and touch-target contracts', () => {
  const app = read('src/App.jsx');

  expect(app).toContain('max-[768px]:fixed');
  expect(app).toContain('max-[768px]:bottom-0');
  expect(app).toContain('max-[768px]:min-h-11');
  expect(app).toContain('max-[768px]:pb-[calc(72px+env(safe-area-inset-bottom))]');
  expect(read('src/components/ui/Drawer.jsx')).toContain('w-full max-w-full');
});

test('mobile route utilities stack dense workspaces without clipping and preserve touch targets', () => {
  expect(read('src/pages/MarketExplorerPage.jsx')).toContain('max-[768px]:[grid-template-columns:minmax(0,_1fr)]');
  expect(read('src/pages/MarketExplorerPage.jsx')).toContain('max-[768px]:[min-height:620px]');
  expect(read('src/pages/ConfigPage.jsx')).toContain('max-[960px]:[grid-template-columns:1fr]');
  expect(read('src/pages/TickerDetailPage.jsx')).toContain('max-[760px]:[max-width:100%]');
  expect(read('src/pages/TickerDetailPage.jsx')).toContain('max-[760px]:[min-width:0]');
  expect(read('src/pages/MarketExplorerPage.jsx')).toContain('max-[768px]:[min-height:44px]');
});

test('command center and journal have mobile-specific product UI adaptations', () => {
  const commandCenter = read('src/pages/CommandCenterPage.jsx');
  const agentResults = read('src/components/command-center/AgentResults.jsx');
  const journalTable = read('src/components/journal/JournalTradeTable.jsx');

  expect(commandCenter).toContain('[align-content:start]');
  expect(agentResults).toContain('[min-height:240px]');
  expect(journalTable).toContain('max-[640px]:hidden');
  expect(journalTable).toContain('max-[640px]:grid');
});

test('viewport-height workspaces flex below the dynamic shell header', () => {
  const app = read('src/App.jsx');

  expect(app).toContain('h-screen min-h-0');
  expect(app).toContain('shrink-0');
  for (const page of ['AIFloorPage', 'JournalPage', 'PortfolioRiskPage', 'AnalyticsPage', 'WatchlistPage', 'ConfigPage', 'MarketExplorerPage']) {
    expect(read(`src/pages/${page}.jsx`)).toMatch(/(?:min-h-0|\[min-height:0\])/);
  }
});

test('tablet layout keeps the side rail until the mobile bottom-nav breakpoint', () => {
  const app = read('src/App.jsx');

  expect(app).not.toContain('max-[1100px]:fixed');
  expect(app).toContain('max-[768px]:fixed');
});
