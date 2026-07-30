import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, expect, test, vi } from 'vitest';
import MarketExplorerPage from '../src/pages/MarketExplorerPage.jsx';

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="location">{`${location.pathname}${location.search}`}</output>;
}

function renderMarketExplorer() {
  return render(
    <MemoryRouter initialEntries={['/market']}>
      <Routes>
        <Route
          path="/market"
          element={
            <>
              <MarketExplorerPage />
              <LocationProbe />
            </>
          }
        />
        <Route path="/command-center" element={<LocationProbe />} />
        <Route path="/ticker/:symbol" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ price: 200, change: 1.5, changePct: 0.75 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
  );
});

test('Market Explorer labels display quotes as non-execution data and preserves ticker drilldown', async () => {
  renderMarketExplorer();

  expect(await screen.findByText('Display quote only, not execution gate')).toBeInTheDocument();
  expect(screen.getByText('Execution price requires Command Center quote gate')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Open AAPL detail' }));
  expect(screen.getByLabelText('location')).toHaveTextContent('/ticker/AAPL');
});

test('Market Explorer renders the TradingView chart as a direct dark-theme iframe', async () => {
  renderMarketExplorer();
  await screen.findByText('฿200.00');

  const widgetFrame = screen.getByTitle('AAPL TradingView chart');
  const widgetConfig = JSON.parse(decodeURIComponent(widgetFrame.getAttribute('src').split('#')[1]));

  expect(widgetFrame).toHaveAttribute('loading', 'lazy');
  expect(widgetConfig.theme).toBe('dark');
  expect(widgetConfig.symbol).toBe('AAPL');
  expect(widgetConfig).not.toHaveProperty('backgroundColor');
  expect(widgetConfig).not.toHaveProperty('gridColor');
  expect(document.querySelector('.tradingview-widget-container script')).not.toBeInTheDocument();
});

test('Market Explorer shows market, sector, and theme overview without fake performance data', async () => {
  renderMarketExplorer();

  const overview = await screen.findByRole('region', { name: 'Market overview' });
  expect(within(overview).getByText('S&P 500')).toBeInTheDocument();
  expect(within(overview).getByText('NASDAQ')).toBeInTheDocument();
  expect(within(overview).getByText('DJI')).toBeInTheDocument();
  expect(within(overview).getByText('Sector overview')).toBeInTheDocument();
  expect(within(overview).getByText('Technology')).toBeInTheDocument();
  expect(within(overview).getByText('Semiconductors')).toBeInTheDocument();
  expect(within(overview).getByText('Sector performance unavailable without verified current data')).toBeInTheDocument();
  expect(within(overview).getByText('Theme watchlists')).toBeInTheDocument();
  expect(within(overview).getByText('AI Infrastructure')).toBeInTheDocument();
  expect(within(overview).getAllByText('Space Data Center').length).toBeGreaterThan(0);
});

test('Market Explorer quick analyze buttons route each ticker to Command Center prefilled ticker', async () => {
  renderMarketExplorer();

  const tickerList = await screen.findByRole('list', { name: 'Ticker list' });
  fireEvent.click(within(tickerList).getByRole('button', { name: 'Quick analyze NVDA' }));

  await waitFor(() => {
    expect(screen.getByLabelText('location')).toHaveTextContent('/command-center?ticker=NVDA');
  });
});

test('Market Explorer flashes refreshed quotes with semantic direction', async () => {
  vi.mocked(fetch)
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ price: 200, change: 1.5, changePct: 0.75 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ price: 190, change: -2, changePct: -1.04 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

  renderMarketExplorer();

  expect(await screen.findByText('฿200.00')).toHaveClass('animate-[data-update-flash-up_0.6s_ease-out]');

  const tickerList = screen.getByRole('list', { name: 'Ticker list' });
  fireEvent.click(within(tickerList).getByRole('button', { name: /NVDA.*NVIDIA Corp\./i }));

  expect(await screen.findByText('฿190.00')).toHaveClass('animate-[data-update-flash-down_0.6s_ease-out]');
});

test('Market Explorer treats a successful but incomplete quote payload as unavailable', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  );

  renderMarketExplorer();

  expect(await screen.findByRole('button', { name: 'Retry quote' })).toBeInTheDocument();
  expect(screen.queryByText('฿—')).not.toBeInTheDocument();
});
