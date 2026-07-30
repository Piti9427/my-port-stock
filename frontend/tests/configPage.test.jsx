import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import ConfigPage from '../src/pages/ConfigPage.jsx';
import { PreferencesContext } from '../src/preferences/PreferencesContext.jsx';

const root = path.resolve(__dirname, '..');
const preferenceContext = {
  preferences: { language: 'en', theme: 'light' },
  savePreferences: vi.fn(),
};

function renderConfig() {
  return render(
    <PreferencesContext.Provider value={preferenceContext}>
      <ConfigPage />
    </PreferencesContext.Provider>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
});

test('Config page exposes production settings sections with sidebar navigation', () => {
  renderConfig();

  const nav = screen.getByRole('navigation', { name: 'Settings sections' });
  for (const section of ['General', 'API Keys', 'Risk Parameters', 'Notifications', 'Data Management']) {
    expect(within(nav).getByRole('button', { name: section })).toBeInTheDocument();
  }

  expect(screen.getByRole('heading', { name: 'General Settings' })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'General Settings' })).toBeInTheDocument();
  fireEvent.click(within(nav).getByRole('button', { name: 'Risk Parameters' }));
  expect(screen.getByRole('heading', { name: 'Risk Parameters' })).toBeInTheDocument();
});

test('Config page saves only the active section and shows section-specific unsaved state', () => {
  renderConfig();

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
  renderConfig();

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

test('Config language controls show English copy when English is selected', () => {
  renderConfig();

  expect(screen.getByText('Language')).toBeInTheDocument();
  expect(screen.getByText('Choose interface display language (Thai or English)')).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Thai (TH)' })).toBeInTheDocument();
});
