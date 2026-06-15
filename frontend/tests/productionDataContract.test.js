import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';

const root = resolve(__dirname, '..');
const read = (file) => readFileSync(resolve(root, file), 'utf8');

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
