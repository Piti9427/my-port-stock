import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const root = resolve(__dirname, '..');
const read = (file) => readFileSync(resolve(root, file), 'utf8');

const dashboardComponents = ['PortfolioSummary.jsx', 'HoldingsTable.jsx', 'WatchlistPanel.jsx', 'AIChatCard.jsx', 'QuickActions.jsx'];

describe('Dashboard decomposition contract', () => {
  test('DashboardPage is composition-only and below the plan size target', () => {
    const source = read('src/pages/DashboardPage.jsx');

    expect(Buffer.byteLength(source, 'utf8')).toBeLessThan(8 * 1024);
    expect(source).toContain("from '../hooks/usePortfolio'");
    expect(source).toContain("from '../hooks/useWatchlist'");
    expect(source).not.toContain('PixelTradingFloor');
    expect(source).not.toMatch(/fetch\(['"]\/api\//);
  });

  test('Dashboard extracts the planned focused components', () => {
    const source = read('src/pages/DashboardPage.jsx');

    for (const component of dashboardComponents) {
      expect(existsSync(resolve(root, 'src/components/dashboard', component))).toBe(true);
      expect(source).toContain(component.replace('.jsx', ''));
    }

    expect(existsSync(resolve(root, 'src/components/ScenarioPlanner.jsx'))).toBe(true);
    expect(source).toContain('ScenarioPlanner');
  });

  test('Dashboard data surfaces use shared runtime primitives', () => {
    const requiredFiles = [
      'src/components/dashboard/HoldingsTable.jsx',
      'src/components/dashboard/PortfolioSummary.jsx',
      'src/components/ScenarioPlanner.jsx',
    ];

    for (const file of requiredFiles) {
      expect(existsSync(resolve(root, file))).toBe(true);
    }

    if (requiredFiles.some((file) => !existsSync(resolve(root, file)))) return;

    const holdingsTable = read('src/components/dashboard/HoldingsTable.jsx');
    const portfolioSummary = read('src/components/dashboard/PortfolioSummary.jsx');
    const scenarioPlanner = read('src/components/ScenarioPlanner.jsx');

    expect(holdingsTable).toContain('DataTable');
    expect(portfolioSummary).toContain('DataStamp');
    expect(scenarioPlanner).toContain('Drawer');
  });

  test('Dashboard uses responsive grid layout for collapse', () => {
    const source = read('src/pages/DashboardPage.jsx');

    expect(source).toContain('grid grid-cols-1 lg:grid-cols-[1fr_360px]');
  });
});
