import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const root = resolve(__dirname, '..');
const read = (file) => readFileSync(resolve(root, file), 'utf8');
const exists = (file) => existsSync(resolve(root, file));

const expectedStyleModules = ['tokens.css', 'base.css', 'layout.css', 'components.css', 'pages.css', 'utilities.css', 'animations.css'];

describe('CSS architecture contract', () => {
  test('index.css is a modular entrypoint for planned style layers', () => {
    const indexCss = read('src/index.css');

    for (const moduleName of expectedStyleModules) {
      expect(exists(`src/styles/${moduleName}`)).toBe(true);
      expect(indexCss).toContain(`@import './styles/${moduleName}';`);
    }

    expect(indexCss.split('\n').filter((line) => line.trim() && !line.trim().startsWith('@import'))).toHaveLength(0);
  });

  test('base typography keeps design canon without Inter remnants', () => {
    const styleSources = expectedStyleModules.map((moduleName) => read(`src/styles/${moduleName}`)).join('\n');

    expect(styleSources).toContain('Plus Jakarta Sans');
    expect(styleSources).toContain('JetBrains Mono');
    expect(styleSources).not.toMatch(/\bInter\b/);
  });

  test('anti-slop CSS has no decorative shadows or width transitions', () => {
    const styleSources = expectedStyleModules.map((moduleName) => read(`src/styles/${moduleName}`)).join('\n');
    const boxShadowDeclarations = Array.from(styleSources.matchAll(/box-shadow:\s*([^;]+);/g));
    const decorativeShadows = boxShadowDeclarations.map((match) => match[1].trim()).filter((value) => value !== 'none' && !value.startsWith('0 0 0'));

    expect(styleSources).not.toMatch(/transition(?:-property)?:\s*[^;]*\bwidth\b/);
    expect(decorativeShadows).toEqual([]);
  });

  test('anti-slop CSS avoids glass blur and oversized fixed radii', () => {
    const styleSources = expectedStyleModules.map((moduleName) => read(`src/styles/${moduleName}`)).join('\n');
    const backdropFilters = Array.from(styleSources.matchAll(/backdrop-filter:\s*([^;]+);/g))
      .map((match) => match[1].trim())
      .filter((value) => value !== 'none');

    expect(backdropFilters).toEqual([]);
    expect(styleSources).not.toMatch(/border-radius:\s*(?:1[7-9]|[2-9]\d)px/);
    expect(styleSources).not.toMatch(/background-clip:\s*text/);
  });

  test('accessibility baseline includes focus-visible and reduced-motion fallbacks', () => {
    const styleSources = expectedStyleModules.map((moduleName) => read(`src/styles/${moduleName}`)).join('\n');
    const utilities = read('src/styles/utilities.css');

    expect(styleSources).toContain(':focus-visible');
    expect(styleSources).toContain('@media (prefers-reduced-motion: reduce)');
    expect(styleSources).toMatch(/:where\(a, button, input, select, textarea, \[tabindex\]\):focus-visible/);
    expect(utilities).toMatch(
      /:where\(a, button, input, select, textarea, \[tabindex\]\):focus-visible\s*{[^}]*outline:\s*2px solid var\(--brand-primary\) !important[^}]*outline-offset:\s*2px/s
    );
  });

  test('visible text and primary actions meet contrast-safe token usage', () => {
    const styleSources = expectedStyleModules.map((moduleName) => read(`src/styles/${moduleName}`)).join('\n');
    const pages = read('src/styles/pages.css');

    expect(read('src/styles/tokens.css')).toContain('--text-muted: #737373;');
    expect(styleSources).not.toMatch(/color:\s*var\(--text-muted\);/);
    expect(pages).toMatch(/\.btn-analyze\s*{[^}]*background:\s*var\(--brand-primary\);[^}]*color:\s*var\(--text-inverse\);/s);
    expect(pages).toMatch(/\.btn-send-ai\s*{[^}]*background:\s*var\(--brand-primary\);[^}]*color:\s*var\(--text-inverse\);/s);
    expect(pages).not.toMatch(/\.btn-send-ai\s*{[^}]*linear-gradient/s);
  });

  test('purposeful motion is limited to route reveal, drawer, toast, data updates, and skeleton feedback', () => {
    const styleSources = expectedStyleModules.map((moduleName) => read(`src/styles/${moduleName}`)).join('\n');

    expect(styleSources).toContain('@keyframes page-enter');
    expect(styleSources).toContain('@keyframes drawer-slide-in');
    expect(styleSources).toContain('@keyframes toast-enter');
    expect(styleSources).toContain('@keyframes toast-exit');
    expect(styleSources).toContain('@keyframes toast-progress');
    expect(styleSources).toContain('@keyframes data-update-flash-up');
    expect(styleSources).toContain('@keyframes data-update-flash-down');
    expect(styleSources).toMatch(/\.app-content > :not\(\.page-header\)\s*{[^}]*animation:\s*page-enter 0\.2s/s);
    expect(styleSources).toMatch(/\.ui-drawer\s*{[^}]*animation:\s*drawer-slide-in 0\.2s/s);
    expect(styleSources).toMatch(/\.ui-toast\s*{[^}]*animation:\s*toast-enter 0\.2s/s);
    expect(styleSources).toMatch(/\.ui-toast\.is-exiting\s*{[^}]*animation:\s*toast-exit 0\.15s/s);
    expect(styleSources).toMatch(/\.ui-toast-progress\s*{[^}]*animation:\s*toast-progress var\(--toast-duration\)/s);
    expect(styleSources).toMatch(/\.data-update-flash--up\s*{[^}]*animation:\s*data-update-flash-up 0\.3s/s);
    expect(styleSources).toMatch(/\.data-update-flash--down\s*{[^}]*animation:\s*data-update-flash-down 0\.3s/s);
    expect(styleSources).toMatch(/\.ui-skeleton\s*{[^}]*transition:\s*opacity 0\.2s/s);
  });
});
