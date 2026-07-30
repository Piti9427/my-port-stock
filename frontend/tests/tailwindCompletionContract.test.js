import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { globSync } from 'glob';
import { describe, expect, test } from 'vitest';

const root = resolve(__dirname, '..');
const read = (file) => readFileSync(resolve(root, file), 'utf8');

describe('completed Tailwind migration architecture', () => {
  test('keeps only token, base, animation, and Tailwind entry CSS', () => {
    const allowed = ['src/index.css', 'src/styles/animations.css', 'src/styles/base.css', 'src/styles/tokens.css'];
    const cssFiles = globSync('src/**/*.css', { cwd: root }).sort();

    expect(cssFiles).toEqual(allowed.sort());
    expect(existsSync(resolve(root, 'src/styles/components.css'))).toBe(false);
    expect(existsSync(resolve(root, 'src/styles/pages.css'))).toBe(false);
  });

  test('uses semantic utilities without hardcoded JSX colors or dark theme variants', () => {
    const sourceFiles = globSync('src/**/*.{js,jsx,ts,tsx}', {
      cwd: root,
      ignore: ['src/**/__tests__/**'],
    });
    const violations = [];

    for (const file of sourceFiles) {
      const source = read(file);
      if (/#[0-9a-fA-F]{3,8}|rgba\(\s*\d|0x[0-9a-fA-F]{6}|className=.*(?:\[\.(?!\.)|dark:)/.test(source)) violations.push(file);
      if (/style\s*=\s*\{\{/.test(source)) violations.push(file);
      if (/className\s*=\s*\{`[^`]*\$\{/.test(source)) violations.push(file);
      if (
        /className=.*\b(?:bg|text|border)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|green|emerald|blue|purple|pink|black|white)(?:-|\/|\b)/.test(
          source
        )
      ) {
        violations.push(file);
      }
    }

    expect([...new Set(violations)]).toEqual([]);
  });
});
