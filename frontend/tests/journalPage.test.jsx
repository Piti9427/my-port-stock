import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, test, vi } from 'vitest';
import JournalPage from '../src/pages/JournalPage';

const getToken = vi.fn().mockResolvedValue('token_123');
const fetchWithAuth = vi.fn();

vi.mock('../src/auth/clerkAdapter', () => ({
  useAuth: () => ({ getToken: (...args) => getToken(...args) }),
}));

vi.mock('../src/lib/api', () => ({ fetchWithAuth: (...args) => fetchWithAuth(...args) }));

const trades = [
  {
    id: 'trade_nvda',
    date: '2026-06-18T10:00:00.000Z',
    ticker: 'NVDA',
    type: 'BUY',
    mode: 'Swing Trade',
    status: 'CLOSED',
    shares: 2,
    price: 200,
    entry: 200,
    target: 240,
    stop_loss: 190,
    risk_reward: 4,
    profit: 120,
    notes: 'AI infrastructure thesis',
    source_note: 'Followed entry plan and closed at target',
  },
  {
    id: 'trade_tsm',
    date: '2026-06-19T10:00:00.000Z',
    ticker: 'TSM',
    type: 'BUY',
    mode: 'Quick Trade',
    status: 'OPEN',
    shares: 1,
    price: 460,
    entry: 460,
    target: 490,
    stop_loss: 450,
    risk_reward: 3,
    profit: -20,
    notes: 'Semiconductor momentum setup',
  },
];

beforeEach(() => {
  fetchWithAuth.mockReset();
  fetchWithAuth.mockImplementation(async (url) => {
    if (url === '/api/journal') return { trades };
    if (url === '/api/holdings') return [{ ticker: 'ASTS' }];
    if (url === '/api/watchlists') return [{ ticker: 'RKLB' }];
    throw new Error(`Unexpected URL: ${url}`);
  });
});

test('Journal page persists filters in the URL and shows expandable trade detail', async () => {
  render(
    <MemoryRouter initialEntries={['/journal?ticker=NVDA&mode=Swing%20Trade&status=CLOSED']}>
      <JournalPage />
    </MemoryRouter>
  );

  expect(await screen.findByRole('link', { name: 'NVDA' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'TSM' })).not.toBeInTheDocument();
  expect(screen.getByLabelText('Ticker filter')).toHaveValue('NVDA');
  expect(screen.getByLabelText('Mode filter')).toHaveValue('Swing Trade');
  expect(screen.getByLabelText('Status filter')).toHaveValue('CLOSED');
  expect(within(screen.getByRole('row', { name: /NVDA/i })).getByText('Closed')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('row', { name: /NVDA/i }));
  expect(screen.getByText('Original thesis')).toBeInTheDocument();
  expect(screen.getByText('AI infrastructure thesis')).toBeInTheDocument();
  expect(screen.getByText('Post-mortem')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Open related analysis/i })).toHaveAttribute('href', '/command-center?ticker=NVDA');

  fireEvent.change(screen.getByLabelText('Mode filter'), { target: { value: 'ALL' } });
  fireEvent.change(screen.getByLabelText('Status filter'), { target: { value: 'ALL' } });
  fireEvent.change(screen.getByLabelText('Ticker filter'), { target: { value: 'TSM' } });
  await waitFor(() => expect(screen.getByRole('link', { name: 'TSM' })).toBeInTheDocument());
  expect(screen.queryByRole('link', { name: 'NVDA' })).not.toBeInTheDocument();
});

test('Journal page does not refetch endlessly when auth token function identity changes', async () => {
  render(
    <MemoryRouter initialEntries={['/journal']}>
      <JournalPage />
    </MemoryRouter>
  );

  await screen.findByRole('link', { name: 'NVDA' });
  await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledTimes(3));
  await new Promise((resolve) => setTimeout(resolve, 50));

  expect(fetchWithAuth.mock.calls.map(([url]) => url)).toEqual(['/api/journal', '/api/holdings', '/api/watchlists']);
});

test('Journal table sorts by realized P/L and opens a risk-aware trade drawer', async () => {
  render(
    <MemoryRouter initialEntries={['/journal']}>
      <JournalPage />
    </MemoryRouter>
  );

  await screen.findByRole('link', { name: 'NVDA' });
  fireEvent.click(screen.getByRole('button', { name: 'P/L' }));
  const rows = screen.getAllByRole('row').filter((row) => within(row).queryByRole('link'));
  expect(within(rows[0]).getByRole('link', { name: 'NVDA' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Log trade' }));
  const drawer = screen.getByRole('dialog', { name: 'Log trade' });
  expect(drawer).toBeInTheDocument();
  expect(within(drawer).getByLabelText('Ticker')).toHaveAttribute('list', 'journal-ticker-suggestions');

  fireEvent.change(within(drawer).getByLabelText('Ticker'), { target: { value: 'RKLB' } });
  fireEvent.change(within(drawer).getByLabelText('Entry Price'), { target: { value: '100' } });
  fireEvent.change(within(drawer).getByLabelText('Stop Loss'), { target: { value: '98' } });
  fireEvent.change(within(drawer).getByLabelText('Target'), { target: { value: '103' } });
  fireEvent.change(within(drawer).getByLabelText('Capital Allocated'), { target: { value: '10000' } });
  fireEvent.change(within(drawer).getByLabelText('Thesis'), { target: { value: 'Breakout with defined risk' } });
  expect(screen.getByText(/R\/R 1.50/)).toBeInTheDocument();
  expect(screen.getByText(/SOP warning/i)).toBeInTheDocument();

  fireEvent.change(within(drawer).getByLabelText('Target'), { target: { value: '106' } });
  fireEvent.click(within(drawer).getByRole('button', { name: 'Save trade' }));

  await waitFor(() =>
    expect(fetchWithAuth).toHaveBeenCalledWith(
      '/api/journal',
      expect.any(Function),
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          ticker: 'RKLB',
          mode: 'Swing Trade',
          price: 100,
          stop_loss: 98,
          target: 106,
          notes: 'Breakout with defined risk',
        }),
      })
    )
  );
});
