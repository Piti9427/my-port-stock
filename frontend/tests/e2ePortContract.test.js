import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';

const repoRoot = resolve(__dirname, '../..');

test('deterministic E2E uses dedicated ports that do not collide with local app defaults', () => {
  const rootPackage = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8'));
  const playwrightConfig = readFileSync(resolve(repoRoot, 'frontend/playwright.config.ts'), 'utf8');
  const serveCommand = rootPackage.scripts['serve:e2e'];

  expect(serveCommand).toContain('PORT=48180');
  expect(serveCommand).toContain('MPS_BACKEND_URL=http://127.0.0.1:48180');
  expect(serveCommand).toContain('--port 43173');
  expect(serveCommand).toContain('--force');
  expect(playwrightConfig).toContain("baseURL: 'http://127.0.0.1:43173'");
  expect(playwrightConfig).toContain("url: 'http://127.0.0.1:43173'");
  expect(serveCommand).not.toMatch(/\b(?:4173|8180)\b/);
});
