import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { beforeEach, expect, test, vi } from 'vitest';
import AnalyticsPage from '../src/pages/AnalyticsPage.jsx';

const getToken = vi.fn().mockResolvedValue('token_123');
const fetchWithAuth = vi.fn();

vi.mock('../src/auth/clerkAdapter', () => ({
  useAuth: () => ({ getToken: (...args) => getToken(...args) }),
}));

vi.mock('../src/lib/api.js', () => ({ fetchWithAuth: (...args) => fetchWithAuth(...args) }));

const closedTrades = [
  {
    id: 'trade_nvda',
    date: '2026-06-01T10:00:00.000Z',
    ticker: 'NVDA',
    mode: 'Swing Trade',
    status: 'CLOSED',
    profit: 120,
  },
  {
    id: 'trade_tsm',
    date: '2026-06-10T10:00:00.000Z',
    ticker: 'TSM',
    mode: 'Quick Trade',
    status: 'CLOSED',
    profit: -40,
  },
  {
    id: 'trade_rklb',
    date: '2026-06-15T10:00:00.000Z',
    ticker: 'RKLB',
    mode: 'Swing Trade',
    status: 'CLOSED',
    profit: 80,
  },
  {
    id: 'trade_open',
    date: '2026-06-16T10:00:00.000Z',
    ticker: 'ASTS',
    mode: 'Swing Trade',
    status: 'OPEN',
    profit: 999,
  },
];

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="location">{location.search}</output>;
}

function renderAnalytics(initialPath = '/analytics') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AnalyticsPage />
      <LocationProbe />
    </MemoryRouter>
  );
}

beforeEach(() => {
  fetchWithAuth.mockReset();
  fetchWithAuth.mockResolvedValue({ trades: closedTrades });
});

test('Analytics page renders KPI cards and a cumulative equity curve from closed journal trades', async () => {
  renderAnalytics();

  expect(await screen.findByRole('heading', { level: 2, name: 'Performance Analytics' })).toBeInTheDocument();
  expect(await screen.findByText('Win Rate')).toBeInTheDocument();
  expect(screen.getAllByText('67%').length).toBeGreaterThan(0);
  expect(screen.getByText('Avg Win/Loss Ratio')).toBeInTheDocument();
  expect(screen.getByText('2.50x')).toBeInTheDocument();
  expect(screen.getByText('Total P/L')).toBeInTheDocument();
  expect(screen.getByText('+฿160')).toBeInTheDocument();
  expect(screen.getByText('Best Trade')).toBeInTheDocument();
  expect(screen.getByText('NVDA +฿120')).toBeInTheDocument();
  expect(screen.getByText('Worst Trade')).toBeInTheDocument();
  expect(screen.getByText('TSM -฿40')).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Equity curve' })).toBeInTheDocument();
  expect(screen.getByText('Cumulative P/L +฿160')).toBeInTheDocument();

  await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledTimes(1));
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(fetchWithAuth).toHaveBeenCalledTimes(1);
});

test('Analytics filters use closed-trade options, date range, and persist to URL params', async () => {
  renderAnalytics('/analytics?ticker=NVDA&mode=Swing%20Trade&start=2026-06-01&end=2026-06-05');

  expect(await screen.findByLabelText('Ticker filter')).toHaveValue('NVDA');
  expect(screen.getByLabelText('Mode filter')).toHaveValue('Swing Trade');
  expect(screen.getByLabelText('Start date filter')).toHaveValue('2026-06-01');
  expect(screen.getByLabelText('End date filter')).toHaveValue('2026-06-05');
  expect(screen.getByRole('cell', { name: 'NVDA' })).toBeInTheDocument();
  expect(screen.queryByRole('cell', { name: 'TSM' })).not.toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Ticker filter'), { target: { value: 'RKLB' } });

  expect(screen.getByLabelText('Ticker filter')).toHaveValue('RKLB');
  expect(screen.getByLabelText('location')).toHaveTextContent('ticker=RKLB');
  expect(screen.queryByRole('cell', { name: 'NVDA' })).not.toBeInTheDocument();
});

test('Analytics distinguishes no closed data from filters with no matching trades', async () => {
  fetchWithAuth.mockResolvedValueOnce({ trades: [{ ticker: 'NVDA', status: 'OPEN', profit: 20 }] });
  renderAnalytics();

  expect(await screen.findByText('ต้องมี trade ที่ปิดแล้วอย่างน้อย 1 รายการ')).toBeInTheDocument();
  expect(screen.getByText('ยังไม่มีข้อมูลเพียงพอสำหรับกราฟ')).toBeInTheDocument();

  cleanup();
  fetchWithAuth.mockReset();
  fetchWithAuth.mockResolvedValue({ trades: closedTrades });
  renderAnalytics('/analytics?ticker=MSFT');

  expect(await screen.findByText('ไม่มี trade ที่ตรงกับ filter นี้')).toBeInTheDocument();
  expect(screen.getByText('ยังไม่มีข้อมูลเพียงพอสำหรับกราฟ')).toBeInTheDocument();
});
