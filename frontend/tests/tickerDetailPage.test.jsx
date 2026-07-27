import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, describe, expect, test, vi } from 'vitest';
import TickerDetailPage from '../src/pages/TickerDetailPage.jsx';

vi.mock('../src/auth/clerkAdapter', () => ({
  useAuth: () => ({
    getToken: async () => 'token_123',
  }),
}));

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="location">{`${location.pathname}${location.search}`}</output>;
}

function renderTickerDetail(path = '/ticker/NVDA') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/ticker/:symbol" element={<TickerDetailPage />} />
        <Route path="/journal" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TickerDetailPage', () => {
  test('renders authenticated per-user ticker context with display-only quote labels', async () => {
    const fetchMock = vi.fn((url) => {
      if (String(url).startsWith('/api/quote/NVDA')) {
        return Promise.resolve(
          jsonResponse({
            ticker: 'NVDA',
            last_price: 190,
            price_sources: ['Yahoo Finance API', 'Nasdaq Quote API'],
            quote_timestamp: '2026-06-20T12:00:00.000Z',
            market_session: 'Regular',
            current_price_acceptance_gate: 'pass',
          })
        );
      }
      if (String(url).startsWith('/api/packet/NVDA')) {
        return Promise.resolve(
          jsonResponse({
            ticker: 'NVDA',
            decision_mode: 'Swing Trade',
            current_price_acceptance_gate: 'pass',
            portfolio_context: {
              source: 'supabase',
              is_held: true,
              holdings_rows: [{ ticker: 'NVDA', shares: 2, avg_cost: 120, sector: 'Semiconductors' }],
            },
            journal_context: {
              source: 'supabase',
              journal_checked: true,
              trade_rows: [{ ticker: 'NVDA', status: 'OPEN', entry: 175, stop_loss: 160 }],
            },
            fundamental_packet: {
              status: 'PASS',
              oracle: {
                piotroski_f_score: 8,
                altman_z_score: 3.5,
                roce: 0.15,
                anchored_vwap: 185.5,
                latest_past_earnings_date: '2026-04-30',
              },
            },
            historical_context_warning: 'Markdown portfolio/journal is historical context only',
          })
        );
      }
      if (String(url).startsWith('/api/journal/NVDA')) {
        return Promise.resolve(
          jsonResponse({
            trades: [{ ticker: 'NVDA', status: 'OPEN', entry: 175, stop_loss: 160 }],
          })
        );
      }
      return Promise.reject(new Error(`Unexpected request ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderTickerDetail();

    expect(screen.getByText(/Loading ticker detail/i)).toBeInTheDocument();

    await screen.findByRole('heading', { level: 2, name: /\$NVDA/ });

    expect(screen.getAllByText(/Display-only quote/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Gate: Pass/i)).toBeInTheDocument();
    expect(screen.getByText(/Supabase per-user context/i)).toBeInTheDocument();
    expect(screen.getByText(/Shares/i)).toBeInTheDocument();
    expect(screen.getByText('2', { selector: '.ticker-detail-value' })).toBeInTheDocument();
    expect(screen.getByText(/Yahoo Finance API/)).toBeInTheDocument();

    // Verify institutional metrics render correctly
    expect(screen.getByText(/Piotroski F-Score/i)).toBeInTheDocument();
    expect(screen.getByText('8/9')).toBeInTheDocument();
    expect(screen.getByText(/Altman Z-Score/i)).toBeInTheDocument();
    expect(screen.getByText('3.50')).toBeInTheDocument();
    expect(screen.getByText(/ROCE/i)).toBeInTheDocument();
    expect(screen.getByText('15.00%')).toBeInTheDocument();
    expect(screen.getByText(/Anchored VWAP/i)).toBeInTheDocument();
    expect(screen.getByText('$185.50')).toBeInTheDocument();
  });

  test('shows Wait state for insufficient runtime context instead of generic error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url) => {
        if (String(url).startsWith('/api/journal/TSM')) {
          return Promise.resolve(jsonResponse({ trades: [] }));
        }
        return Promise.resolve(
          jsonResponse({
            status: 'INSUFFICIENT_DATA',
            error_details: 'Supabase runtime data unavailable for authenticated analysis context',
          })
        );
      })
    );

    renderTickerDetail('/ticker/TSM');

    await screen.findByRole('heading', { level: 2, name: /\$TSM/ });

    expect(screen.getByText(/Wait/i)).toBeInTheDocument();
    expect(screen.getByText(/INSUFFICIENT_DATA/i)).toBeInTheDocument();
    expect(screen.queryByText(/Connection failed/i)).not.toBeInTheDocument();
  });

  test('announces request failures and retries the full ticker context', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error_details: 'Runtime lookup failed' }, 500));
    vi.stubGlobal('fetch', fetchMock);

    renderTickerDetail();

    expect(await screen.findByRole('alert')).toHaveTextContent('Ticker detail unavailable');
    expect(screen.getByRole('alert')).toHaveTextContent('Runtime lookup failed');

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(6));
  });

  test('runs analysis through authenticated API helper with the route ticker', async () => {
    const fetchMock = vi.fn((url) => {
      if (String(url).startsWith('/api/quote/NVDA')) {
        return Promise.resolve(jsonResponse({ ticker: 'NVDA', last_price: 190, current_price_acceptance_gate: 'pass' }));
      }
      if (String(url).startsWith('/api/packet/NVDA')) {
        return Promise.resolve(
          jsonResponse({
            ticker: 'NVDA',
            current_price_acceptance_gate: 'pass',
            portfolio_context: { source: 'supabase', is_held: false, holdings_rows: [] },
            journal_context: { source: 'supabase', trade_rows: [] },
          })
        );
      }
      if (String(url).startsWith('/api/journal/NVDA')) {
        return Promise.resolve(jsonResponse({ trades: [] }));
      }
      if (String(url) === '/api/analyze') {
        return Promise.resolve(
          jsonResponse({
            decision_snapshot: { verdict: 'Wait', gate_status: 'fail' },
          })
        );
      }
      return Promise.reject(new Error(`Unexpected request ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderTickerDetail();

    await screen.findByRole('heading', { level: 2, name: /\$NVDA/ });
    fireEvent.click(screen.getByRole('button', { name: /วิเคราะห์ Setup/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/analyze',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ ticker: 'NVDA', decision_mode: 'Swing Trade' }),
          headers: expect.objectContaining({ Authorization: 'Bearer token_123' }),
        })
      );
    });
  });

  test('opens a hydrated scenario planner and carries the ticker into the journal flow', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url) => {
        if (String(url).startsWith('/api/packet/NVDA')) {
          return Promise.resolve(
            jsonResponse({
              current_price_acceptance_gate: 'pass',
              portfolio_context: {
                source: 'supabase',
                holdings_rows: [{ ticker: 'NVDA', shares: 2, avg_cost: 120 }],
              },
              journal_context: { source: 'supabase', trade_rows: [] },
            })
          );
        }
        if (String(url).startsWith('/api/journal/NVDA')) return Promise.resolve(jsonResponse({ trades: [] }));
        return Promise.resolve(jsonResponse({ last_price: 190, current_price_acceptance_gate: 'pass' }));
      })
    );

    renderTickerDetail();
    const plannerBtn = await screen.findByRole('button', { name: /เปิด Scenario Planner/i });
    fireEvent.click(plannerBtn);

    expect(screen.getByRole('dialog', { name: /NVDA Scenario Planner/i })).toBeInTheDocument();
    expect(screen.getByLabelText('จำนวนหุ้นที่มี')).toHaveValue(2);
    expect(screen.getByLabelText('ราคาเฉลี่ย')).toHaveValue(120);

    fireEvent.change(screen.getByLabelText('แนวรับ 1'), { target: { value: '180' } });
    fireEvent.change(screen.getByLabelText('จุดตัดขาดทุน'), { target: { value: '170' } });
    fireEvent.change(screen.getByLabelText('ราคาเป้าหมาย'), { target: { value: '210' } });
    fireEvent.click(screen.getByRole('button', { name: 'เปิดบันทึกเทรด' }));

    expect(screen.getByLabelText('location')).toHaveTextContent('/journal?ticker=NVDA');
  });
});
