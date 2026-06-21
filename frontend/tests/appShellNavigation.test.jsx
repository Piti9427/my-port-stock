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
  expect(screen.getByRole('heading', { level: 1, name: 'แดชบอร์ด' })).toBeInTheDocument();
  expect(screen.getByText(/Supabase holdings/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Collapse sidebar/i }));
  expect(nav).toHaveClass('collapsed');
  expect(screen.getByRole('button', { name: /Expand sidebar/i })).toBeInTheDocument();

  fireEvent.keyDown(globalThis, { key: 'b', metaKey: true });
  expect(nav).not.toHaveClass('collapsed');
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

test('mobile shell CSS uses a bottom navigation rail with touch targets', () => {
  const styles = `${read('src/styles/layout.css')}\n${read('src/styles/pages.css')}`;

  expect(styles).toContain('@media (max-width: 768px)');
  expect(styles).toMatch(/\.app-content\s*{[^}]*padding-bottom:\s*calc\(72px \+ env\(safe-area-inset-bottom\)\)/s);
  expect(styles).toMatch(/\.side-nav,\s*\.side-nav\.collapsed\s*{[^}]*position:\s*fixed[^}]*bottom:\s*0/s);
  expect(styles).toMatch(/\.side-link,\s*\.side-nav\.collapsed \.side-link\s*{[^}]*min-height:\s*44px/s);
  expect(styles).toMatch(/\.ui-drawer\s*{[^}]*width:\s*100% !important/s);
});

test('mobile route CSS stacks dense workspaces without clipping and enforces 44px controls', () => {
  const styles = `${read('src/styles/layout.css')}\n${read('src/styles/pages.css')}`;

  expect(styles).toMatch(
    /@media \(max-width: 768px\)[\s\S]*\.market-explorer\s*{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)[^}]*height:\s*auto[^}]*overflow:\s*visible/
  );
  expect(styles).toMatch(/@media \(max-width: 768px\)[\s\S]*\.explorer-chart-panel\s*{[^}]*min-height:\s*620px/);
  expect(styles).toMatch(/@media \(max-width: 768px\)[\s\S]*\.chart-header\s*{[^}]*align-items:\s*stretch[^}]*flex-direction:\s*column/);
  expect(styles).toMatch(/@media \(max-width: 768px\)[\s\S]*\.config-sidenav\s*{[^}]*width:\s*100%[^}]*min-width:\s*0/);
  expect(styles).toMatch(/@media \(max-width: 768px\)[\s\S]*\.config-sections-nav\s*{[^}]*min-width:\s*0[^}]*overflow-x:\s*auto/);
  expect(styles).toMatch(
    /@media \(max-width: 760px\)[\s\S]*\.ticker-detail-page\s*{[^}]*width:\s*calc\(100% - \(var\(--space-4\) \* 2\)\)[^}]*max-width:\s*100%[^}]*padding:\s*var\(--space-4\) 0/
  );
  expect(styles).toMatch(
    /@media \(max-width: 760px\)[\s\S]*\.ticker-detail-header,\s*\.ticker-detail-grid,\s*\.ticker-detail-context,\s*\.ticker-detail-history,\s*\.ticker-detail-sources,\s*\.ticker-detail-state,\s*\.ticker-detail-actions\s*{[^}]*min-width:\s*0/
  );
  expect(styles).toMatch(/\.app-content :is\(button, input, select, textarea\)\s*{[^}]*min-height:\s*44px !important/s);
  expect(styles).toMatch(/\.ticker-row__quick-analyze,\s*\.search-clear\s*{[^}]*min-width:\s*44px[^}]*min-height:\s*44px/s);
});

test('viewport-height workspaces flex below the dynamic shell header', () => {
  const layout = read('src/styles/layout.css');
  const pages = read('src/styles/pages.css');

  expect(layout).toMatch(/\.app-content\s*{[^}]*height:\s*100vh[^}]*min-height:\s*0/s);
  expect(layout).toMatch(/\.page-header\s*{[^}]*flex:\s*0 0 auto/s);
  expect(pages).not.toContain('var(--nav-height)');
  for (const selector of ['ai-floor-page', 'journal-page', 'risk-page', 'analytics-page', 'watchlist-page', 'config-page', 'market-explorer']) {
    expect(pages).toMatch(new RegExp(`\\.${selector}\\s*{[^}]*flex:\\s*1 1 auto;[^}]*min-height:\\s*0;`, 's'));
  }
});

test('tablet layout keeps the side rail until the mobile bottom-nav breakpoint', () => {
  const styles = read('src/styles/pages.css');
  const tabletStart = styles.indexOf('@media (max-width: 1100px)');
  const tabletEnd = styles.indexOf('@media (max-width: 900px)', tabletStart);
  const tabletBlock = styles.slice(tabletStart, tabletEnd);

  expect(tabletBlock).not.toContain('.app-root');
  expect(tabletBlock).not.toContain('.side-nav {');
  expect(tabletBlock).not.toContain('.side-nav-links');
  expect(styles).toMatch(/@media \(max-width: 768px\)[\s\S]*\.side-nav,\s*\.side-nav\.collapsed\s*{[^}]*position:\s*fixed/s);
});
