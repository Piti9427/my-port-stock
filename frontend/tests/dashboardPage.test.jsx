import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import DashboardPage from '../src/pages/DashboardPage.jsx';

const portfolioState = {
  holdings: [
    {
      ticker: 'NVDA',
      name: 'NVIDIA',
      shares: 2,
      avg_cost: 80,
      price: 100,
      change: 2,
      changePct: 2.04,
      spark: [95, 97, 100],
    },
  ],
  loading: false,
  status: 'OK',
  meta: { source: 'Supabase holdings', as_of: '2026-06-21T00:00:00.000Z' },
  refetch: vi.fn(),
};

const watchlistState = {
  items: [{ ticker: 'TSM', name: 'TSMC', price: 200, changePct: 1.2, spark: [195, 198, 200] }],
  loading: false,
  status: 'OK',
  refetch: vi.fn(),
};

vi.mock('../src/auth/clerkAdapter', () => ({
  useAuth: () => ({ getToken: async () => 'token_123' }),
}));

vi.mock('../src/hooks/usePortfolio.js', () => ({
  usePortfolio: () => portfolioState,
}));

vi.mock('../src/hooks/useWatchlist.js', () => ({
  useWatchlist: () => watchlistState,
}));

vi.mock('../src/components/PixelTradingFloor', () => ({ default: () => null }));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <DashboardPage />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } })));
});

test('Dashboard composes runtime portfolio and watchlist surfaces', () => {
  renderDashboard();

  expect(screen.getByRole('region', { name: /Portfolio summary/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Holdings' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Watchlist' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'AI Quick Ask' })).toBeInTheDocument();
});

test('Dashboard routes holdings and quick analysis to the intended workflows', async () => {
  renderDashboard();

  fireEvent.click(screen.getByRole('row', { name: /NVDA/ }));
  expect(screen.getByTestId('location')).toHaveTextContent('/ticker/NVDA');

  fireEvent.change(screen.getByRole('textbox', { name: /Ticker to analyze/i }), {
    target: { value: 'tsm' },
  });
  fireEvent.submit(screen.getByRole('form', { name: /AI quick ask/i }));

  await waitFor(() => {
    expect(screen.getByTestId('location')).toHaveTextContent('/command-center?ticker=TSM');
  });
});

test('Dashboard opens Scenario Planner from a holding without leaving the page', () => {
  renderDashboard();

  fireEvent.click(screen.getByRole('button', { name: /วางแผน NVDA/i }));
  expect(screen.getByRole('dialog', { name: /NVDA Scenario Planner/i })).toBeInTheDocument();
  expect(screen.getByTestId('location')).toHaveTextContent('/');
});
