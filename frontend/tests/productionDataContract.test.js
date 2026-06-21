import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { fetchWithAuth } from '../src/lib/api.js';
import { useApi } from '../src/hooks/useApi.js';
import { useJournal } from '../src/hooks/useJournal.js';
import { usePortfolio } from '../src/hooks/usePortfolio.js';
import { useWatchlist } from '../src/hooks/useWatchlist.js';

const root = resolve(__dirname, '..');
const read = (file) => readFileSync(resolve(root, file), 'utf8');
const readCssBundle = () => {
  const entry = read('src/index.css');
  const modules = Array.from(entry.matchAll(/@import\s+'\.\/styles\/([^']+)';/g), (match) => read(`src/styles/${match[1]}`));
  return [entry, ...modules].join('\n');
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test('Dashboard holdings use real empty portfolio copy instead of sample data copy', () => {
  const source = read('src/components/dashboard/HoldingsTable.jsx');

  expect(source).toContain('No portfolio data yet');
  expect(source).not.toMatch(/sample|mock|demo portfolio/i);
});

test('HTML entrypoint does not include local-only live reload scripts', () => {
  const source = read('index.html');

  expect(source).not.toContain('localhost:8400');
  expect(source).not.toContain('live.js');
});

test('Command Center sends canonical decision mode values', () => {
  const controls = read('src/components/command-center/AnalysisControls.jsx');
  const hook = read('src/hooks/useCommandCenter.js');

  expect(controls).toContain("'Swing Trade'");
  expect(hook).toContain('decision_mode: decisionMode');
  expect(controls).not.toContain('เทรดรอบ (Swing Trade)');
});

test('Command Center displays canonical last_price quote field', () => {
  const quotePanel = read('src/components/command-center/QuotePanel.jsx');
  const page = read('src/pages/CommandCenterPage.jsx');

  expect(quotePanel).toContain('quote.last_price');
  expect(page).toContain('state.quote?.last_price');
  expect(quotePanel).not.toContain('current_price ||');
});

test('Watchlist does not initialize live alert feed with hard-coded alerts', () => {
  const source = read('src/pages/WatchlistPage.jsx');

  expect(source).not.toContain('INITIAL_ALERTS');
  expect(source).not.toContain('Breakout confirmed above');
});

test('Deep analysis surfaces render tabbed SOP sections from structured payloads', () => {
  const commandCenter = read('src/pages/CommandCenterPage.jsx');
  const deepAnalysisTabs = read('src/components/DeepAnalysisTabs.jsx');

  expect(commandCenter).toContain('DeepAnalysisTabs');
  expect(commandCenter).toContain('deep_analysis');

  expect(deepAnalysisTabs).toContain('สรุป & SWOT');
  expect(deepAnalysisTabs).toContain('งบการเงิน & ปัจจัยพื้นฐาน');
  expect(deepAnalysisTabs).toContain('สัญญาณเทคนิคอล');
  expect(deepAnalysisTabs).toContain('แผนเทรด SOP');
});

test('App keeps Clerk auth by default but supports explicit dev UI auth bypass', () => {
  const app = read('src/App.jsx');
  const devAuth = read('src/auth/devAuth.js');
  const clerkAdapter = read('src/auth/clerkAdapter.jsx');
  const pkg = JSON.parse(read('package.json'));

  expect(app).toContain('isDevAuthBypassEnabled');
  expect(app).toContain('devAuthBypass && <AuthenticatedShell showUserButton={false} />');
  expect(app).toContain('<Show when="signed-out">');
  expect(app).toContain('<Show when="signed-in">');
  expect(read('src/main.jsx')).toContain('AppAuthProvider');
  expect(read('src/main.jsx')).toContain('!PUBLISHABLE_KEY && !devAuthBypass');
  expect(read('src/auth/clerkAdapter.jsx')).toContain("from '@clerk/react'");
  expect(clerkAdapter).toContain('DEV_AUTH_BYPASS_STATE');
  expect(clerkAdapter).toContain('return DEV_AUTH_BYPASS_STATE');
  expect(devAuth).toContain("env.DEV === true && env.VITE_DEV_AUTH_BYPASS === 'true'");
  expect(pkg.scripts['dev:ui']).toContain('VITE_DEV_AUTH_BYPASS=true');
});

test('Command Center has responsive layout contracts for small screens', () => {
  const commandCenter = read('src/pages/CommandCenterPage.jsx');
  const chatPanel = read('src/components/command-center/ChatPanel.jsx');
  const css = readCssBundle();

  expect(commandCenter).toContain('command-center-page command-workspace');
  expect(commandCenter).toContain('command-workspace-header');
  expect(commandCenter).toContain('command-progressive-grid');
  expect(commandCenter).toContain('command-setup-column');
  expect(commandCenter).toContain('command-results-column');
  expect(chatPanel).toContain('command-chat-panel');
  expect(css).toContain('@media (max-width: 900px)');
  expect(css).toContain('.command-progressive-grid');
  expect(css).toContain('.command-center-page.command-workspace');
  expect(css).toContain('grid-template-columns: minmax(0, 1fr)');
  expect(css).toContain('.command-chat-thread');
});

test('Ticker drilldown route and entry points are wired through the product app', () => {
  const app = read('src/App.jsx');
  const dashboard = read('src/pages/DashboardPage.jsx');
  const watchlist = read('src/pages/WatchlistPage.jsx');
  const journal = read('src/components/journal/JournalTradeTable.jsx');
  const market = read('src/pages/MarketExplorerPage.jsx');
  const commandCenter = read('src/pages/CommandCenterPage.jsx');

  expect(app).toContain("from './pages/TickerDetailPage'");
  expect(app).toContain('path="/ticker/:symbol"');
  expect(dashboard).toMatch(/navigate\(`\/ticker\/\$\{[^`]+/);
  expect(watchlist).toMatch(/navigate\(`\/ticker\/\$\{[^`]+/);
  expect(journal).toMatch(/to=\{`\/ticker\/\$\{[^`]+/);
  expect(market).toMatch(/navigate\(`\/ticker\/\$\{[^`]+/);
  expect(commandCenter).toMatch(/navigate\(`\/ticker\/\$\{[^`]+/);
});

test('Command palette is wired as a global authenticated navigation surface', () => {
  const app = read('src/App.jsx');
  const keyboardShortcuts = read('src/components/KeyboardShortcuts.jsx');
  const css = readCssBundle();

  expect(app).toContain("from './components/CommandPalette'");
  expect(app).toContain('<CommandPalette');
  expect(app).toContain('sidebar-cmd-hint');
  expect(app).toContain('<kbd>⌘</kbd>');
  expect(app).toContain('<kbd>K</kbd>');
  expect(keyboardShortcuts).toContain('Cmd+K');
  expect(css).toContain('.command-palette-backdrop');
  expect(css).toContain('.sidebar-cmd-hint');
});

test('fetchWithAuth sends auth headers and mutation options', async () => {
  const getToken = vi.fn().mockResolvedValue('token_123');
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ saved: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  );
  vi.stubGlobal('fetch', fetchMock);

  const result = await fetchWithAuth('/api/journal', getToken, {
    method: 'POST',
    body: { ticker: 'NVDA', type: 'BUY' },
  });

  expect(result).toEqual({ saved: true });
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/journal',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ ticker: 'NVDA', type: 'BUY' }),
      headers: expect.objectContaining({
        Authorization: 'Bearer token_123',
        'Content-Type': 'application/json',
      }),
    })
  );
});

test('fetchWithAuth preserves insufficient-data payloads and normalizes non-2xx errors', async () => {
  const getToken = vi.fn().mockResolvedValue('token_123');
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: 'INSUFFICIENT_DATA',
          error_details: 'Supabase runtime data unavailable',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  vi.stubGlobal('fetch', fetchMock);

  await expect(fetchWithAuth('/api/packet/NVDA', getToken)).resolves.toEqual({
    status: 'INSUFFICIENT_DATA',
    error_details: 'Supabase runtime data unavailable',
  });

  await expect(fetchWithAuth('/api/holdings', getToken)).rejects.toMatchObject({
    name: 'ApiError',
    status: 401,
    message: 'Unauthorized',
    payload: { error: 'Unauthorized' },
  });
});

test('useApi exposes production API state and refetches on demand', async () => {
  const getToken = vi.fn().mockResolvedValue('token_123');
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        holdings: [],
        as_of: '2026-06-20T12:00:00.000Z',
        source: 'supabase',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  );
  vi.stubGlobal('fetch', fetchMock);

  const { result } = renderHook(() => useApi('/api/holdings', { getToken }));

  expect(result.current.loading).toBe(true);

  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(result.current.error).toBe(null);
  expect(result.current.status).toBe('EMPTY');
  expect(result.current.data).toEqual({
    holdings: [],
    as_of: '2026-06-20T12:00:00.000Z',
    source: 'supabase',
  });
  expect(result.current.meta).toEqual({
    as_of: '2026-06-20T12:00:00.000Z',
    source: 'supabase',
  });

  await act(async () => {
    await result.current.refetch();
  });

  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test('useApi marks cached data stale after staleMs', async () => {
  const getToken = vi.fn().mockResolvedValue('token_123');
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ holdings: [{ ticker: 'NVDA' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
  );

  const { result } = renderHook(() => useApi('/api/holdings', { getToken, staleMs: 500 }));

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.isStale).toBe(false);

  await waitFor(() => expect(result.current.isStale).toBe(true), { timeout: 1000 });
});

test('useApi aborts stale in-flight requests on unmount', async () => {
  const getToken = vi.fn().mockResolvedValue('token_123');
  let requestSignal = null;
  const fetchMock = vi.fn((_url, options) => {
    requestSignal = options.signal;
    return new Promise(() => {});
  });
  vi.stubGlobal('fetch', fetchMock);

  const { unmount } = renderHook(() => useApi('/api/holdings', { getToken }));

  await waitFor(() => expect(requestSignal).not.toBe(null));

  unmount();

  expect(requestSignal.aborted).toBe(true);
});

test('usePortfolio normalizes holdings and portfolio summary', async () => {
  const getToken = vi.fn().mockResolvedValue('token_123');
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          { ticker: 'NVDA', shares: 2, price: 190, sector: 'Semiconductors' },
          { ticker: 'TSM', shares: 1, price: 220, sector: 'Semiconductors' },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )
  );

  const { result } = renderHook(() => usePortfolio({ getToken }));

  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(result.current.status).toBe('OK');
  expect(result.current.holdings).toHaveLength(2);
  expect(result.current.summary).toMatchObject({
    holdingsCount: 2,
    totalValue: 600,
    sectorCount: 1,
  });
});

test('useJournal normalizes trades, closed trades, and stats', async () => {
  const getToken = vi.fn().mockResolvedValue('token_123');
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          trades: [
            { ticker: 'NVDA', status: 'OPEN', profit: null },
            { ticker: 'TSM', status: 'CLOSED', profit: 42 },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )
  );

  const { result } = renderHook(() => useJournal({ getToken }));

  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(result.current.trades).toHaveLength(2);
  expect(result.current.closedTrades).toEqual([{ ticker: 'TSM', status: 'CLOSED', profit: 42 }]);
  expect(result.current.stats).toMatchObject({
    totalTrades: 2,
    openTrades: 1,
    closedTrades: 1,
    realizedProfit: 42,
  });
});

test('useWatchlist normalizes items and exposes add/remove mutations', async () => {
  const getToken = vi.fn().mockResolvedValue('token_123');
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          { ticker: 'NVDA', alert_price: 200, alert_type: 'above' },
          { ticker: 'TSM', alert_price: null, alert_type: 'below' },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify([{ ticker: 'AMD' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify([{ ticker: 'AMD', alert_price: 150, alert_type: 'above' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'removed' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  vi.stubGlobal('fetch', fetchMock);

  const { result } = renderHook(() => useWatchlist({ getToken }));

  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(result.current.items).toHaveLength(2);
  expect(result.current.alerts).toEqual([{ ticker: 'NVDA', alertPrice: 200, alertType: 'above' }]);

  await act(async () => {
    await result.current.add({ ticker: 'AMD' });
  });
  await act(async () => {
    await result.current.remove('AMD');
  });

  expect(fetchMock).toHaveBeenNthCalledWith(
    2,
    '/api/watchlists',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ ticker: 'AMD' }),
    })
  );
  expect(fetchMock).toHaveBeenNthCalledWith(4, '/api/watchlists/AMD', expect.objectContaining({ method: 'DELETE' }));
});
