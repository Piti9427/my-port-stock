import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import App from '../src/App.jsx';

const fetchWithAuth = vi.fn();

vi.mock('@sentry/react', () => ({
  ErrorBoundary: ({ children }) => children,
}));

vi.mock('../src/auth/devAuth', () => ({
  isDevAuthBypassEnabled: () => true,
  shouldUseClerkProvider: () => false,
}));

vi.mock('../src/lib/api', () => ({ fetchWithAuth: (...args) => fetchWithAuth(...args) }));

const store = {
  holdings: [],
  journal: [],
  watchlists: [],
};

function quoteFor(ticker) {
  return {
    ticker,
    last_price: ticker === 'TSM' ? 220 : 200,
    currency: 'USD',
    market_session: 'regular',
    quote_timestamp: '2026-06-21T14:30:00.000Z',
    price_sources: ['Yahoo Finance', 'Nasdaq'],
    quote_delay_status: { yahoo: 'delayed', nasdaq: 'delayed' },
    current_price_acceptance_gate: 'pass',
  };
}

function holdingFor(ticker) {
  return store.holdings.find((holding) => holding.ticker === ticker);
}

function upsertHolding(trade) {
  if (String(trade.type || 'BUY').toUpperCase() !== 'BUY') return;
  const existing = holdingFor(trade.ticker);
  const shares = Number(trade.shares) || 1;
  const price = Number(trade.price ?? trade.entry) || quoteFor(trade.ticker).last_price;
  const nextHolding = {
    id: `holding_${trade.ticker}`,
    ticker: trade.ticker,
    name: `${trade.ticker} Inc.`,
    sector: trade.ticker === 'TSM' ? 'Semiconductors' : 'AI Infrastructure',
    shares: (Number(existing?.shares) || 0) + shares,
    avg_cost: price,
    price,
    change: 1.5,
    changePct: 0.75,
    stop_loss: Number(trade.stop_loss) || price * 0.92,
    spark: [price * 0.96, price * 0.99, price],
  };

  if (existing) {
    Object.assign(existing, nextHolding);
  } else {
    store.holdings.push(nextHolding);
  }
}

function addTrade(body) {
  const trade = {
    id: `trade_${store.journal.length + 1}`,
    date: body.date || '2026-06-21T15:00:00.000Z',
    created_at: body.created_at || '2026-06-21T15:00:00.000Z',
    ticker: String(body.ticker || '').toUpperCase(),
    type: body.type || 'BUY',
    mode: body.mode || 'Swing Trade',
    status: body.status || 'OPEN',
    shares: Number(body.shares) || 1,
    price: Number(body.price ?? body.entry) || 200,
    entry: Number(body.entry ?? body.price) || 200,
    target: body.target,
    stop_loss: body.stop_loss,
    risk_reward: body.risk_reward,
    profit: body.profit,
    notes: body.notes || 'Execution thesis recorded',
    source_note: body.source_note || '',
  };

  store.journal.unshift(trade);
  upsertHolding(trade);
  return trade;
}

function packetFor(ticker) {
  return {
    ticker,
    ...quoteFor(ticker),
    portfolio_context: {
      source: 'supabase',
      holdings_rows: store.holdings.filter((holding) => holding.ticker === ticker),
    },
    journal_context: {
      source: 'supabase',
      trade_rows: store.journal.filter((trade) => trade.ticker === ticker),
    },
  };
}

function resetStore(seedReturningUser = false) {
  store.holdings = [];
  store.journal = [];
  store.watchlists = [];

  if (!seedReturningUser) return;

  addTrade({
    ticker: 'NVDA',
    status: 'CLOSED',
    shares: 2,
    price: 180,
    entry: 180,
    target: 225,
    stop_loss: 168,
    risk_reward: 3.75,
    profit: 90,
    notes: 'Closed AI infrastructure thesis',
    source_note: 'Closed at target with lessons recorded',
  });
  addTrade({
    ticker: 'TSM',
    status: 'OPEN',
    shares: 1,
    price: 220,
    entry: 220,
    target: 250,
    stop_loss: 210,
    risk_reward: 3,
    notes: 'Returning user active setup',
  });
  store.watchlists.push({ ticker: 'RKLB', sector: 'Space', price: 14, changePct: 1.2, spark: [13, 13.5, 14] });
}

function installApiMock() {
  fetchWithAuth.mockImplementation(async (url, _getToken, options = {}) => {
    const method = options.method || (options.body ? 'POST' : 'GET');

    if (url === '/api/holdings') return [...store.holdings];
    if (url === '/api/watchlists') return [...store.watchlists];
    if (url === '/api/journal' && method === 'POST') {
      const trade = addTrade(options.body || {});
      return { id: trade.id, trade };
    }
    if (url === '/api/journal') return { trades: [...store.journal] };
    if (url.startsWith('/api/journal/')) {
      const ticker = decodeURIComponent(url.slice('/api/journal/'.length)).toUpperCase();
      return { trades: store.journal.filter((trade) => trade.ticker === ticker) };
    }
    if (url.startsWith('/api/quote/')) {
      const ticker = decodeURIComponent(url.slice('/api/quote/'.length)).toUpperCase();
      return quoteFor(ticker);
    }
    if (url.startsWith('/api/packet/')) {
      const ticker = decodeURIComponent(url.slice('/api/packet/'.length).split('?')[0]).toUpperCase();
      return packetFor(ticker);
    }
    if (url === '/api/analyze') {
      const ticker = String(options.body?.ticker || 'NVDA').toUpperCase();
      return {
        ticker,
        decision_snapshot: {
          verdict: 'Wait',
          score: 6.4,
          one_line_reason: 'Needs broker confirmation before execution.',
          immediate_next_action: 'Confirm Tier 1 quote before adding risk.',
        },
        agent_results: {
          fundamental: { score: 6, reason: 'Quality setup, wait for execution gate.' },
        },
      };
    }

    throw new Error(`Unexpected URL: ${url}`);
  });
}

function renderAppAt(path = '/') {
  window.history.pushState({}, '', path);
  return render(<App />);
}

beforeEach(() => {
  fetchWithAuth.mockReset();
  resetStore(false);
  installApiMock();
});

test('new dev-signed-in user can analyze, log a first trade, then inspect journal, analytics, and risk states', async () => {
  renderAppAt('/dashboard');

  expect(await screen.findByText('เริ่มต้นโดยเพิ่มหุ้นในพอร์ต')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'วิเคราะห์หุ้น' }));

  expect(await screen.findByRole('heading', { level: 1, name: 'วิเคราะห์หุ้น' })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Ticker symbol'), { target: { value: 'NVDA' } });
  fireEvent.click(screen.getByRole('button', { name: 'Load quote' }));

  expect(await screen.findByText(/Gate-passed quote/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'วิเคราะห์' }));

  expect(await screen.findByText('Confirm Tier 1 quote before adding risk.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Log executed trade' }));

  const ticket = screen.getByRole('dialog', { name: /NVDA .* Record executed trade/i });
  fireEvent.change(within(ticket).getByLabelText('Shares'), { target: { value: '1' } });
  fireEvent.change(within(ticket).getByLabelText('Execution price'), { target: { value: '200' } });
  fireEvent.change(within(ticket).getByLabelText('Stop loss'), { target: { value: '184' } });
  fireEvent.change(within(ticket).getByLabelText('Target'), { target: { value: '240' } });
  fireEvent.click(within(ticket).getByRole('button', { name: 'Record executed trade' }));

  expect(await screen.findByRole('heading', { level: 1, name: 'บันทึกเทรด' })).toBeInTheDocument();
  expect(await screen.findByRole('link', { name: 'NVDA' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('link', { name: 'สถิติผลงาน' }));
  expect(await screen.findByText('ต้องมี trade ที่ปิดแล้วอย่างน้อย 1 รายการ')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('link', { name: 'ความเสี่ยง' }));
  expect((await screen.findAllByText(/AI Infrastructure/i)).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/NVDA/).length).toBeGreaterThan(0);
});

test('returning dev-signed-in user can drill into a holding, run analysis, plan risk, and append a journal trade', async () => {
  resetStore(true);
  renderAppAt('/dashboard');

  expect(await screen.findByRole('row', { name: /NVDA/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('row', { name: /NVDA/i }));

  expect(await screen.findByRole('heading', { level: 1, name: '$NVDA' })).toBeInTheDocument();
  expect((await screen.findAllByText(/Supabase per-user context/i)).length).toBeGreaterThan(0);
  expect(screen.getByText('CLOSED')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /วิเคราะห์ Setup/i }));
  expect(await screen.findByText('Latest Analysis')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'เปิด Scenario Planner' }));
  const planner = screen.getByRole('dialog', { name: /NVDA Scenario Planner/i });
  fireEvent.change(within(planner).getByLabelText('แนวรับ 1'), { target: { value: '190' } });
  fireEvent.change(within(planner).getByLabelText('จุดตัดขาดทุน'), { target: { value: '180' } });
  fireEvent.change(within(planner).getByLabelText('ราคาเป้าหมาย'), { target: { value: '230' } });
  expect(within(planner).getByText('1:4.0')).toBeInTheDocument();
  fireEvent.click(within(planner).getByRole('button', { name: 'เปิดบันทึกเทรด' }));

  expect(await screen.findByRole('heading', { level: 1, name: 'บันทึกเทรด' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Log trade' }));
  const drawer = screen.getByRole('dialog', { name: 'Log trade' });
  fireEvent.change(within(drawer).getByLabelText('Ticker'), { target: { value: 'NVDA' } });
  fireEvent.change(within(drawer).getByLabelText('Entry Price'), { target: { value: '190' } });
  fireEvent.change(within(drawer).getByLabelText('Stop Loss'), { target: { value: '180' } });
  fireEvent.change(within(drawer).getByLabelText('Target'), { target: { value: '230' } });
  fireEvent.change(within(drawer).getByLabelText('Capital Allocated'), { target: { value: '10000' } });
  fireEvent.change(within(drawer).getByLabelText('Thesis'), { target: { value: 'Scenario planner add-on' } });
  fireEvent.click(within(drawer).getByRole('button', { name: 'Save trade' }));

  await waitFor(() => expect(store.journal.filter((trade) => trade.ticker === 'NVDA')).toHaveLength(2));
  await waitFor(() => expect(screen.getAllByRole('link', { name: 'NVDA' })).toHaveLength(2));
});
