import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import WatchlistPage from '../src/pages/WatchlistPage';

const getToken = vi.fn().mockResolvedValue('token_123');
const fetchWithAuth = vi.fn();

vi.mock('../src/auth/clerkAdapter', () => ({
  useAuth: () => ({ getToken }),
}));

vi.mock('../src/lib/api', () => ({ fetchWithAuth: (...args) => fetchWithAuth(...args) }));

const mockWatchlist = [
  {
    ticker: 'NVDA',
    name: 'NVDA',
    sector: 'Technology',
    price: 130,
    changePct: 2.5,
    volume: '10M',
    aiSignal: 'buy-zone',
    setup: 'Bull flag breakout',
    alert_price: 135,
    alert_type: 'above',
  },
  {
    ticker: 'TSLA',
    name: 'TSLA',
    sector: 'Consumer Cyclical',
    price: 200,
    changePct: -1.5,
    volume: '20M',
    aiSignal: 'monitor',
    setup: 'Consolidation',
    alert_price: 190,
    alert_type: 'below',
  },
];

beforeEach(() => {
  fetchWithAuth.mockReset();
  fetchWithAuth.mockImplementation(async (url) => {
    if (url === '/api/watchlists') return mockWatchlist;
    throw new Error(`Unexpected URL: ${url}`);
  });
});

test('Watchlist page renders with items displayed', async () => {
  render(
    <MemoryRouter initialEntries={['/watchlist']}>
      <WatchlistPage />
    </MemoryRouter>
  );

  await screen.findByRole('heading', { name: /Watchlist & Scanners/i });
  expect(screen.getByRole('row', { name: /NVDA/i })).toBeInTheDocument();
  expect(screen.getByRole('row', { name: /TSLA/i })).toBeInTheDocument();
  expect(screen.getByText('Bull flag breakout')).toBeInTheDocument();
});

test('Watchlist page signal filters work properly', async () => {
  render(
    <MemoryRouter initialEntries={['/watchlist']}>
      <WatchlistPage />
    </MemoryRouter>
  );

  await screen.findByRole('row', { name: /NVDA/i });

  // Filter by buy-zone
  fireEvent.click(screen.getByRole('button', { name: 'Buy Zone' }));
  expect(screen.getByRole('row', { name: /NVDA/i })).toBeInTheDocument();
  expect(screen.queryByRole('row', { name: /TSLA/i })).not.toBeInTheDocument();

  // Filter by monitor
  fireEvent.click(screen.getByRole('button', { name: 'Monitor' }));
  expect(screen.queryByRole('row', { name: /NVDA/i })).not.toBeInTheDocument();
  expect(screen.getByRole('row', { name: /TSLA/i })).toBeInTheDocument();

  // Filter by accumulate (should show nothing)
  fireEvent.click(screen.getByRole('button', { name: 'Accumulate' }));
  expect(screen.queryByRole('row', { name: /NVDA/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('row', { name: /TSLA/i })).not.toBeInTheDocument();
  expect(screen.getByText('No tickers match this filter')).toBeInTheDocument();
});

test('Watchlist page renders empty state when no items', async () => {
  fetchWithAuth.mockImplementation(async (url) => {
    if (url === '/api/watchlists') return [];
    throw new Error(`Unexpected URL: ${url}`);
  });

  render(
    <MemoryRouter initialEntries={['/watchlist']}>
      <WatchlistPage />
    </MemoryRouter>
  );

  await screen.findByText('Your watchlist is empty');
  expect(screen.getByText('Add tickers to track signals, alerts, and setups.')).toBeInTheDocument();
});

test('Watchlist page handles error state', async () => {
  fetchWithAuth.mockImplementation(async () => {
    throw new Error('API Error');
  });

  render(
    <MemoryRouter initialEntries={['/watchlist']}>
      <WatchlistPage />
    </MemoryRouter>
  );

  await screen.findByText('Insufficient data');
  expect(screen.getByText('Connect Supabase data or run analysis before this panel can calculate.')).toBeInTheDocument();
});
