import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');

const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const readCssBundle = () => {
  const entry = read('src/index.css');
  const modules = Array.from(entry.matchAll(/@import\s+'\.\/styles\/([^']+)';/g), (match) => read(`src/styles/${match[1]}`));
  return [entry, ...modules].join('\n');
};

describe('impeccable critique remediation contract', () => {
  it('keeps runtime data pages explicit about source, empty states, and no fake live feed', () => {
    const watchlist = read('src/pages/WatchlistPage.jsx');
    const analytics = read('src/pages/AnalyticsPage.jsx');
    const risk = read('src/pages/PortfolioRiskPage.jsx');

    expect(watchlist).toContain('DATA_STAMP');
    expect(watchlist).toContain('Your watchlist is empty');
    expect(watchlist).not.toContain('INITIAL_ALERTS');
    expect(analytics).toContain('Insufficient data');
    expect(risk).toContain('Insufficient data');
  });

  it('keeps destructive watchlist removal recoverable', () => {
    const watchlist = read('src/pages/WatchlistPage.jsx');

    expect(watchlist).toContain('UndoToast');
    expect(watchlist).toContain('onUndo');
    expect(watchlist).toContain('aria-live="polite"');
  });

  it('keeps scenario planner protected against invalid trade math', () => {
    const scenarioPlanner = read('src/components/ScenarioPlanner.jsx');

    expect(scenarioPlanner).toContain('ราคาเป้าหมายต้องสูงกว่าจุดตัดขาดทุน');
    expect(scenarioPlanner).toContain('แนวรับต้องเรียงจาก S1 สูงสุดไป S3 ต่ำสุด');
    expect(scenarioPlanner).toContain('disabled={hasErrors || rows.length === 0}');
  });

  it('does not keep Inter remnants in product UI CSS', () => {
    const css = readCssBundle();

    expect(css).not.toMatch(/font-family:\s*['"]Inter['"]/);
  });

  it('does not reintroduce banned decorative UI patterns in source CSS', () => {
    const css = readCssBundle();

    expect(css).not.toMatch(/background-clip:\s*text/);
    expect(css).not.toMatch(/transition:[^;]*width/);
    expect(css).not.toMatch(/cubic-bezier\(0\.34,\s*1\.56/);
  });
});
