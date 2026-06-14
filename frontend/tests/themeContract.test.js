import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(__dirname, '../src/index.css'), 'utf8');
const main = readFileSync(resolve(__dirname, '../src/main.jsx'), 'utf8');

const rootBlock = css.match(/:root\s*\{(?<body>[\s\S]*?)\n\s*\}/)?.groups?.body ?? '';

function tokenValue(name) {
  const match = rootBlock.match(new RegExp(`${name.replaceAll('-', '\\-')}\\s*:\\s*([^;]+);`));
  return match?.[1]?.trim();
}

describe('Dark Terminal Product UI theme contract', () => {
  test('exposes dark terminal tokens as the shared app theme', () => {
    expect(tokenValue('--background')).toBe('#0a0a0a');
    expect(tokenValue('--foreground')).toBe('#ededed');
    expect(tokenValue('--bg-void')).toBe('#0a0a0a');
    expect(tokenValue('--bg-shell')).toBe('#111111');
    expect(tokenValue('--bg-panel')).toBe('#171717');
    expect(tokenValue('--bg-panel-solid')).toBe('#0f0f0f');
    expect(tokenValue('--surface')).toBe('#171717');
    expect(tokenValue('--border-subtle')).toBe('#262626');
    expect(tokenValue('--text-primary')).toBe('#ededed');
    expect(tokenValue('--text-secondary')).toBe('#a3a3a3');
    expect(tokenValue('--brand-primary')).toBe('#10b981');
    expect(tokenValue('--accent-primary')).toBe('#60a5fa');
  });

  test('keeps compatibility aliases for existing page code', () => {
    expect(tokenValue('--fin-success')).toBe('var(--fin-profit)');
    expect(tokenValue('--fin-danger')).toBe('var(--fin-loss)');
    expect(tokenValue('--border-color')).toBe('var(--border-subtle)');
  });

  test('applies the same dark terminal contract to Clerk auth surfaces', () => {
    expect(main).toContain('const clerkAppearance = {');
    expect(main).toContain("colorBackground: '#111111'");
    expect(main).toContain("colorForeground: '#ededed'");
    expect(main).toContain("colorInput: '#171717'");
    expect(main).toContain("colorBorder: '#262626'");
    expect(main).toContain('appearance={clerkAppearance}');
  });
});
