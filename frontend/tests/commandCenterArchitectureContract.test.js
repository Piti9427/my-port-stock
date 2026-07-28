import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '..');
const read = (file) => readFileSync(resolve(root, file), 'utf8');

const COMPONENTS = ['TickerInput', 'QuotePanel', 'AnalysisControls', 'AgentResults', 'DecisionSnapshot', 'TradeTicket', 'ChatPanel'];

describe('Command Center production architecture', () => {
  it('keeps the page composition-focused and authenticated', () => {
    const source = read('src/pages/CommandCenterPage.jsx');
    const hook = read('src/hooks/useCommandCenter.js');

    expect(Buffer.byteLength(source)).toBeLessThan(6000);
    expect(hook).toContain('useAuth');
    expect(hook).toContain('fetchWithAuth');
    expect(source).not.toContain("from 'pixi.js'");
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toContain('btn btn-success');
    expect(source).not.toContain('btn btn-danger');
  });

  it.each(COMPONENTS)('extracts %s as an owned panel', (name) => {
    expect(() => read(`src/components/command-center/${name}.jsx`)).not.toThrow();
  });

  it('keeps deep analysis and trade logging explicit', () => {
    const source = read('src/pages/CommandCenterPage.jsx');
    const hook = read('src/hooks/useCommandCenter.js');
    const tradeTicket = read('src/components/command-center/TradeTicket.jsx');

    expect(source).toContain('DeepAnalysisTabs');
    expect(hook).toContain("fetchWithAuth('/api/analyze'");
    expect(hook).toContain("fetchWithAuth('/api/journal'");
    expect(tradeTicket).toContain('Record executed trade');
  });

  it('defines a responsive progressive-disclosure layout', () => {
    const source = read('src/pages/CommandCenterPage.jsx');
    const css = read('src/index.css');

    expect(source).toContain('command-progressive-grid grid grid-cols-1 lg:grid-cols-[320px_1fr]');
    expect(css).toMatch(/@media\s*\(max-width:\s*900px\)[\s\S]*\.command-progressive-grid/);
    expect(source).toContain('DecisionSnapshot');
  });
});
