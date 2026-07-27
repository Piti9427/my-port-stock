import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, expect, test, vi } from 'vitest';
import CommandPalette from '../src/components/CommandPalette.jsx';

vi.mock('../src/auth/clerkAdapter', () => ({
  useAuth: () => ({
    getToken: async () => 'token_123',
  }),
}));

function jsonResponse(payload) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function CommandPaletteHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open palette
      </button>
      <CommandPalette open={open} onOpenChange={setOpen} />
      <Routes>
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

test('Cmd+K opens command palette and ticker results navigate to ticker drilldown', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn((url) => {
      if (String(url) === '/api/holdings') {
        return Promise.resolve(jsonResponse([{ ticker: 'NVDA', name: 'NVIDIA', sector: 'Semiconductors' }]));
      }
      if (String(url) === '/api/watchlists') {
        return Promise.resolve(jsonResponse([{ ticker: 'ASTS', sector: 'Space Data Center' }]));
      }
      return Promise.reject(new Error(`Unexpected request ${url}`));
    })
  );

  render(
    <MemoryRouter initialEntries={['/']}>
      <CommandPaletteHarness />
    </MemoryRouter>
  );

  fireEvent.keyDown(window, { key: 'k', metaKey: true });

  expect(await screen.findByRole('dialog', { name: /Command Palette/i })).toBeInTheDocument();

  fireEvent.change(screen.getByRole('searchbox', { name: /Search commands/i }), {
    target: { value: 'ASTS' },
  });

  fireEvent.click(await screen.findByRole('option', { name: /\$ASTS/i }));

  await waitFor(() => {
    expect(screen.getByTestId('location')).toHaveTextContent('/ticker/ASTS');
  });
});

test('Command Palette traps focus, closes from any option, and restores its trigger', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([])));

  render(
    <MemoryRouter initialEntries={['/']}>
      <CommandPaletteHarness />
    </MemoryRouter>
  );

  const trigger = screen.getByRole('button', { name: 'Open palette' });
  trigger.focus();
  fireEvent.click(trigger);

  const search = await screen.findByRole('searchbox', { name: /Search commands/i });
  await waitFor(() => expect(search).toHaveFocus());

  fireEvent.keyDown(search, { key: 'Tab', shiftKey: true });
  const options = screen.getAllByRole('option');
  expect(options.at(-1)).toHaveFocus();

  fireEvent.keyDown(options.at(-1), { key: 'Escape' });

  expect(screen.queryByRole('dialog', { name: /Command Palette/i })).not.toBeInTheDocument();
  await waitFor(() => expect(trigger).toHaveFocus());
});
