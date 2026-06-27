import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import ConfigPage from '../src/pages/ConfigPage.jsx';

const root = path.resolve(__dirname, '..');

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
});

test('Config page exposes production settings sections with sidebar navigation', () => {
  render(<ConfigPage />);

  const nav = screen.getByRole('navigation', { name: 'Settings sections' });
  for (const section of ['General', 'API Keys', 'Risk Parameters', 'Notifications', 'Data Management']) {
    expect(within(nav).getByRole('button', { name: section })).toBeInTheDocument();
  }

  expect(screen.getByRole('heading', { name: 'General' })).toBeInTheDocument();
  fireEvent.click(within(nav).getByRole('button', { name: 'Risk Parameters' }));
  expect(screen.getByRole('heading', { name: 'Risk Parameters' })).toBeInTheDocument();
});

test('Config page saves only the active section and shows section-specific unsaved state', () => {
  render(<ConfigPage />);

  const nav = screen.getByRole('navigation', { name: 'Settings sections' });
  fireEvent.click(within(nav).getByRole('button', { name: 'Risk Parameters' }));
  fireEvent.change(screen.getByLabelText('Max position size per stock'), { target: { value: '12' } });

  expect(within(nav).getByRole('button', { name: /Risk Parameters.*Unsaved/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Save Risk Parameters' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Save Risk Parameters' }));

  expect(within(nav).getByRole('button', { name: 'Risk Parameters' })).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem('myportstock_config_v1'))).toMatchObject({ maxPositionPct: 12 });
});

test('Config API key section masks secrets and never stores API key in localStorage', () => {
  render(<ConfigPage />);

  fireEvent.click(screen.getByRole('button', { name: 'API Keys' }));
  const apiKeyInput = screen.getByLabelText('Gemini API key');
  expect(apiKeyInput).toHaveAttribute('type', 'password');

  fireEvent.change(apiKeyInput, { target: { value: 'AIza_secret_value' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save API Keys' }));

  const stored = JSON.parse(localStorage.getItem('myportstock_config_v1'));
  expect(stored).not.toHaveProperty('apiKey');
});

test('ConfigPage stays orchestration-only after section extraction', () => {
  const source = fs.readFileSync(path.join(root, 'src/pages/ConfigPage.jsx'), 'utf8');

  expect(source.length).toBeLessThan(5000);
  expect(source).toContain("from '../components/config/'");
});
