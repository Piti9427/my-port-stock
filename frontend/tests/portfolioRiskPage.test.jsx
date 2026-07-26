import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import PortfolioRiskPage from '../src/pages/PortfolioRiskPage.jsx';

const getToken = vi.fn().mockResolvedValue('token_123');
const fetchWithAuth = vi.fn();

vi.mock('../src/auth/clerkAdapter', () => ({
  useAuth: () => ({ getToken: (...args) => getToken(...args) }),
}));

vi.mock('../src/lib/api.js', () => ({ fetchWithAuth: (...args) => fetchWithAuth(...args) }));

const holdings = [
  {
    id: 'holding_nvda',
    ticker: 'NVDA',
    shares: 2,
    price: 200,
    avg_cost: 150,
    sector: 'Semiconductors',
    stop_loss: 180,
  },
  {
    id: 'holding_tsm',
    ticker: 'TSM',
    shares: 1,
    price: 100,
    avg_cost: 90,
    sector: 'Semiconductors',
  },
  {
    id: 'holding_asts',
    ticker: 'ASTS',
    shares: 1,
    price: 200,
    avg_cost: 120,
    sector: 'Space',
    stop_loss: 150,
  },
];

beforeEach(() => {
  fetchWithAuth.mockReset();
  fetchWithAuth.mockResolvedValue(holdings);
});

test('Portfolio Risk sector buttons are accessible, selectable, and do not refetch on unstable auth wrapper identity', async () => {
  render(
    <MemoryRouter>
      <PortfolioRiskPage />
    </MemoryRouter>
  );

  const semiconductorButton = await screen.findByRole('button', {
    name: /Semiconductors: 71\.4 percent of portfolio, limit 35 percent, Over limit/i,
  });
  expect(semiconductorButton).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getAllByText('Over limit').length).toBeGreaterThan(0);

  const spaceButton = screen.getByRole('button', {
    name: /Space: 28\.6 percent of portfolio, limit 35 percent, Within limit/i,
  });
  fireEvent.click(spaceButton);

  expect(spaceButton).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('region', { name: 'Space holdings' })).toBeInTheDocument();

  await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledTimes(1));
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(fetchWithAuth).toHaveBeenCalledTimes(1);
});

test('Portfolio Risk shows position-level value, weight, stop distance, THB risk, and missing stop status', async () => {
  render(
    <MemoryRouter>
      <PortfolioRiskPage />
    </MemoryRouter>
  );

  expect(await screen.findByRole('columnheader', { name: 'Ticker' })).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: 'Value' })).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: 'Weight%' })).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: 'Stop Distance' })).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: 'THB Risk' })).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();

  const nvdaRow = screen.getByRole('row', { name: /NVDA/ });
  expect(within(nvdaRow).getByText('฿400')).toBeInTheDocument();
  expect(within(nvdaRow).getByText('57.1%')).toBeInTheDocument();
  expect(within(nvdaRow).getByText('10.0%')).toBeInTheDocument();
  expect(within(nvdaRow).getByText('฿40')).toBeInTheDocument();
  expect(within(nvdaRow).getByText('Stop defined')).toBeInTheDocument();

  const tsmRow = screen.getByRole('row', { name: /TSM/ });
  expect(within(tsmRow).getByText('Missing stop-loss')).toBeInTheDocument();
  expect(within(tsmRow).getAllByText('Unknown')).toHaveLength(2);
});

test('Portfolio Risk renders known-risk budget gauge and missing-stop summary', async () => {
  render(
    <MemoryRouter>
      <PortfolioRiskPage />
    </MemoryRouter>
  );

  expect(await screen.findByText('฿90')).toBeInTheDocument();
  expect(screen.getByText(/งบประมาณ ฿50,000/)).toBeInTheDocument();
  expect(screen.getByText(/1 position missing stop-loss/)).toBeInTheDocument();

  const gauge = screen.getByRole('progressbar', { name: 'Risk budget used' });
  expect(gauge).toHaveAttribute('aria-valuemin', '0');
  expect(gauge).toHaveAttribute('aria-valuenow', '90');
  expect(gauge).toHaveAttribute('aria-valuemax', '50000');
});
