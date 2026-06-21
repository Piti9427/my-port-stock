import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import CommandCenterPage from '../src/pages/CommandCenterPage';

vi.mock('../src/auth/clerkAdapter', () => ({
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue('token_123') }),
}));

vi.mock('../src/hooks/useAgentEvents', () => ({
  useAgentEvents: () => ({ agentStates: {}, analysisResult: null }),
}));

vi.mock('pixi.js', () => ({
  Application: class {
    init() {
      return Promise.resolve();
    }
    canvas = document.createElement('canvas');
    stage = { addChild: vi.fn() };
    ticker = { add: vi.fn(), remove: vi.fn() };
    destroy() {}
  },
  Assets: {
    load: vi.fn().mockResolvedValue({ width: 32, height: 32, source: {} }),
  },
  Sprite: class {
    anchor = { set: vi.fn() };
    scale = { set: vi.fn() };
  },
  Rectangle: class {},
  Texture: class {},
  Graphics: class {
    circle() {}
    fill() {}
  },
}));

test('prefills a normalized ticker from the dashboard deep link without fetching', () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch');

  render(
    <MemoryRouter initialEntries={['/command-center?ticker=nvda']}>
      <CommandCenterPage />
    </MemoryRouter>
  );

  expect(screen.getByLabelText('Ticker symbol')).toHaveValue('NVDA');
  expect(fetchSpy).not.toHaveBeenCalled();

  fetchSpy.mockRestore();
});

test('ignores malformed ticker query values', () => {
  render(
    <MemoryRouter initialEntries={['/command-center?ticker=DROP%20TABLE']}>
      <CommandCenterPage />
    </MemoryRouter>
  );

  expect(screen.getByLabelText('Ticker symbol')).toHaveValue('');
});
