import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';

const root = resolve(__dirname, '..');
const read = (file) => readFileSync(resolve(root, file), 'utf8');

test('Dashboard uses real empty portfolio copy instead of sample data copy', () => {
  const source = read('src/pages/DashboardPage.jsx');

  expect(source).toContain('No portfolio data yet');
  expect(source).not.toMatch(/sample|mock|demo portfolio/i);
});

test('Dashboard sends canonical decision mode values', () => {
  const source = read('src/pages/DashboardPage.jsx');

  expect(source).toContain('value="Swing Trade"');
  expect(source).not.toContain('<option>เทรดรอบ (Swing Trade)</option>');
});

test('Command Center displays canonical last_price quote field', () => {
  const source = read('src/pages/CommandCenterPage.jsx');

  expect(source).toContain('quoteData.last_price');
  expect(source).not.toContain('quoteData.current_price ||');
});

test('Watchlist does not initialize live alert feed with hard-coded alerts', () => {
  const source = read('src/pages/WatchlistPage.jsx');

  expect(source).not.toContain('INITIAL_ALERTS');
  expect(source).not.toContain('Breakout confirmed above');
});

test('Deep analysis surfaces render tabbed SOP sections from structured payloads', () => {
  const dashboard = read('src/pages/DashboardPage.jsx');
  const commandCenter = read('src/pages/CommandCenterPage.jsx');
  const deepAnalysisTabs = read('src/components/DeepAnalysisTabs.jsx');

  for (const source of [dashboard, commandCenter]) {
    expect(source).toContain('DeepAnalysisTabs');
    expect(source).toContain('deep_analysis');
  }

  expect(deepAnalysisTabs).toContain('สรุป & SWOT');
  expect(deepAnalysisTabs).toContain('งบการเงิน & ปัจจัยพื้นฐาน');
  expect(deepAnalysisTabs).toContain('สัญญาณเทคนิคอล');
  expect(deepAnalysisTabs).toContain('แผนเทรด SOP');
});

test('App keeps Clerk auth by default but supports explicit dev UI auth bypass', () => {
  const app = read('src/App.jsx');
  const devAuth = read('src/auth/devAuth.js');
  const pkg = JSON.parse(read('package.json'));

  expect(app).toContain('isDevAuthBypassEnabled');
  expect(app).toContain('devAuthBypass && <AuthenticatedShell showUserButton={false} />');
  expect(app).toContain('<Show when="signed-out">');
  expect(app).toContain('<Show when="signed-in">');
  expect(read('src/main.jsx')).toContain('AppAuthProvider');
  expect(read('src/main.jsx')).toContain('!PUBLISHABLE_KEY && !devAuthBypass');
  expect(read('src/auth/clerkAdapter.jsx')).toContain("from '@clerk/react'");
  expect(devAuth).toContain("env.DEV === true && env.VITE_DEV_AUTH_BYPASS === 'true'");
  expect(pkg.scripts['dev:ui']).toContain('VITE_DEV_AUTH_BYPASS=true');
});

test('Command Center has responsive layout contracts for small screens', () => {
  const commandCenter = read('src/pages/CommandCenterPage.jsx');
  const css = read('src/index.css');

  expect(commandCenter).toContain('command-center-layout');
  expect(commandCenter).toContain('command-center-feed');
  expect(commandCenter).toContain('command-center-main');
  expect(commandCenter).toContain('command-center-actions');
  expect(commandCenter).toContain('ai-floor-summary');
  expect(css).toContain('@media (max-width: 900px)');
  expect(css).toContain('.command-center-layout');
  expect(css).toContain('grid-template-columns: minmax(0, 1fr)');
  expect(css).toContain('.trading-floor-canvas canvas');
  expect(css).toContain('aspect-ratio: 4 / 3');
});
