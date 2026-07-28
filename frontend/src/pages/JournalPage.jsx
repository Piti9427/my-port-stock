import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Clock, Plus } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { useAuth } from '../auth/clerkAdapter';
import { fetchWithAuth } from '../lib/api';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { JournalFilters } from '../components/journal/JournalFilters.jsx';
import { JournalTradeTable } from '../components/journal/JournalTradeTable.jsx';
import { TradeLogDrawer } from '../components/journal/TradeLogDrawer.jsx';

function normalizeTicker(value) {
  return String(value || '')
    .trim()
    .toUpperCase();
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
}

function dateValue(trade) {
  const value = trade.date || trade.created_at;
  return value && !Number.isNaN(Date.parse(value)) ? new Date(value).getTime() : 0;
}

function tradeValue(trade, key) {
  if (key === 'date') return dateValue(trade);
  if (key === 'price') return Number(trade.price ?? trade.entry ?? 0);
  if (key === 'profit' || key === 'shares') return Number(trade[key] ?? 0);
  return String(trade[key] ?? '');
}

function compareTrades(left, right, sort) {
  const leftValue = tradeValue(left, sort.key);
  const rightValue = tradeValue(right, sort.key);
  const result =
    typeof leftValue === 'number' && typeof rightValue === 'number'
      ? leftValue - rightValue
      : String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true });
  return sort.direction === 'asc' ? result : -result;
}

function nextSort(current, key) {
  if (current.key === key) {
    return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
  }
  return { key, direction: key === 'date' || key === 'profit' ? 'desc' : 'asc' };
}

function parseFilters(searchParams) {
  return {
    ticker: searchParams.get('ticker') || 'ALL',
    mode: searchParams.get('mode') || 'ALL',
    status: searchParams.get('status') || 'ALL',
    start: searchParams.get('start') || '',
    end: searchParams.get('end') || '',
  };
}

function parseSort(searchParams) {
  const direction = searchParams.get('dir') === 'asc' ? 'asc' : 'desc';
  return { key: searchParams.get('sort') || 'date', direction };
}

export default function JournalPage() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const [searchParams, setSearchParams] = useSearchParams();
  const [trades, setTrades] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [expandedTradeId, setExpandedTradeId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const filters = parseFilters(searchParams);
  const sort = parseSort(searchParams);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    const [journalResult, holdingsResult, watchlistResult] = await Promise.allSettled([
      fetchWithAuth('/api/journal', getTokenRef.current),
      fetchWithAuth('/api/holdings', getTokenRef.current),
      fetchWithAuth('/api/watchlists', getTokenRef.current),
    ]);

    if (journalResult.status === 'rejected') {
      setTrades([]);
      setSuggestions([]);
      setError(journalResult.reason?.message || 'Supabase journal data unavailable');
      setLoading(false);
      return;
    }

    const journalTrades = Array.isArray(journalResult.value?.trades) ? journalResult.value.trades : [];
    const holdingTickers =
      holdingsResult.status === 'fulfilled' && Array.isArray(holdingsResult.value) ? holdingsResult.value.map((row) => row.ticker) : [];
    const watchlistTickers =
      watchlistResult.status === 'fulfilled' && Array.isArray(watchlistResult.value) ? watchlistResult.value.map((row) => row.ticker) : [];

    setTrades(journalTrades);
    setSuggestions(uniqueSorted([...holdingTickers, ...watchlistTickers, ...journalTrades.map((trade) => trade.ticker)]));
    setLoading(false);
  }, []);

  useEffect(() => {
    // Initial route load intentionally owns the async loading/error state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName) || event.target.isContentEditable) {
        return;
      }
      if (event.key.toLowerCase() === 'c' && !drawerOpen) {
        event.preventDefault();
        setDrawerOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawerOpen]);

  const tickerOptions = useMemo(() => uniqueSorted(trades.map((trade) => normalizeTicker(trade.ticker))), [trades]);
  const modeOptions = useMemo(() => uniqueSorted(trades.map((trade) => trade.mode)), [trades]);

  const filteredTrades = useMemo(() => {
    return trades
      .filter((trade) => {
        const tickerOk = filters.ticker === 'ALL' || normalizeTicker(trade.ticker) === filters.ticker;
        const modeOk = filters.mode === 'ALL' || trade.mode === filters.mode;
        const statusOk = filters.status === 'ALL' || String(trade.status || 'OPEN').toUpperCase() === filters.status;
        const tradeDate = dateValue(trade);
        const startMs = filters.start ? new Date(filters.start).getTime() : NaN;
        const endMs = filters.end ? new Date(`${filters.end}T23:59:59`).getTime() : NaN;
        const startOk = !filters.start || Number.isNaN(startMs) || tradeDate >= startMs;
        const endOk = !filters.end || Number.isNaN(endMs) || tradeDate <= endMs;
        return tickerOk && modeOk && statusOk && startOk && endOk;
      })
      .sort((left, right) => compareTrades(left, right, sort));
  }, [filters.end, filters.mode, filters.start, filters.status, filters.ticker, sort, trades]);

  const setParam = (key, value, defaultValue = 'ALL') => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (!value || value === defaultValue) next.delete(key);
      else next.set(key, value);
      return next;
    });
  };

  const setFilter = (key, value) => {
    setParam(key, value, key === 'start' || key === 'end' ? '' : 'ALL');
  };

  const setSort = (key) => {
    const updated = nextSort(sort, key);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('sort', updated.key);
      next.set('dir', updated.direction);
      return next;
    });
  };

  const resetFilters = () => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      ['ticker', 'mode', 'status', 'start', 'end'].forEach((key) => next.delete(key));
      return next;
    });
  };

  const emptyDescription = trades.length === 0 ? 'บันทึกเทรดครั้งแรกเพื่อเริ่มติดตาม' : 'ไม่มี trade ที่ตรงกับ filter นี้';

  return (
    <div className="[flex:1_1_auto] [min-height:0] [overflow-y:auto] [padding:24px_28px] [display:grid] [grid-template-columns:minmax(0,_1fr)_320px] [grid-template-rows:auto_1fr] [gap:20px] [grid-template-areas:'header_header'_'trades_perf'] max-[1100px]:[grid-template-columns:1fr] max-[1100px]:[grid-template-areas:'header'_'perf'_'trades'] max-[560px]:[padding:var(--space-4)] max-[768px]:![overflow-y:visible] max-[768px]:![height:auto] max-[768px]:![min-height:0]">
      <header className="rounded-lg border border-border bg-panel shadow-none [grid-area:header] [display:grid] [gap:var(--space-5)] [&_h2]:[margin:0_0_var(--space-1)] [&_h2]:[color:var(--text-primary)] [&_h2]:[font-size:1.2rem] [&_p]:[margin:0] [&_p]:[color:var(--text-secondary)] [&_p]:[font-size:0.84rem] [&_p]:[line-height:1.55]">
        <div className="[display:flex] [align-items:flex-start] [justify-content:space-between] [gap:var(--space-4)] max-[1100px]:[flex-direction:column]">
          <div>
            <h2>บันทึกการเทรดและวิเคราะห์หลังจบเกม</h2>
            <p>ทบทวน thesis, execution, risk/reward และ post-mortem จาก Supabase journal</p>
          </div>
          <button
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border border-transparent bg-brand px-5 py-3 font-sans text-sm font-bold tracking-wide text-text-inverse transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-hover disabled:text-text-secondary"
            type="button"
            onClick={() => setDrawerOpen(true)}
          >
            <Plus size={16} aria-hidden="true" />
            Log trade
          </button>
        </div>
        <JournalFilters filters={filters} modeOptions={modeOptions} tickerOptions={tickerOptions} onFilterChange={setFilter} onReset={resetFilters} />
      </header>

      <section
        className="rounded-lg border border-border bg-panel shadow-none [grid-area:trades] [display:flex] [flex-direction:column] [overflow:hidden]"
        aria-labelledby="journal-trades-title"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-6 py-4 max-[640px]:flex-col max-[640px]:items-start">
          <span
            id="journal-trades-title"
            className="[font-size:0.85rem] [font-weight:600] [letter-spacing:0.06em] [text-transform:uppercase] [color:var(--text-secondary)]"
          >
            ประวัติคำสั่งซื้อขาย
          </span>
          <span className="font-mono [font-size:0.75rem] [color:var(--text-secondary)] [display:flex] [align-items:center] [gap:4px]">
            <Clock size={10} aria-hidden="true" />
            <span>Supabase journal data</span>
          </span>
        </div>
        {error ? (
          <EmptyState title="Insufficient data" description={error} action={{ label: 'Retry', onClick: loadData }} />
        ) : (
          <JournalTradeTable
            emptyAction={trades.length === 0 ? { label: 'บันทึกเทรดครั้งแรก', onClick: () => setDrawerOpen(true) } : undefined}
            emptyDescription={emptyDescription}
            expandedTradeId={expandedTradeId}
            loading={loading}
            onExpandTrade={(trade) => setExpandedTradeId((current) => (current === trade.id ? null : trade.id))}
            onSortChange={setSort}
            sort={sort}
            trades={filteredTrades}
          />
        )}
      </section>

      <aside
        className="rounded-lg border border-border bg-panel shadow-none [&_p]:[margin:0] [&_p]:[color:var(--text-secondary)] [&_p]:[font-size:0.84rem] [&_p]:[line-height:1.55] [grid-area:perf] [display:flex] [flex-direction:column] [gap:16px]"
        aria-labelledby="journal-loop-title"
      >
        <div
          id="journal-loop-title"
          className="[font-size:0.85rem] [font-weight:600] [letter-spacing:0.06em] [text-transform:uppercase] [color:var(--text-secondary)]"
        >
          Decision loop
        </div>
        <div className="[&_div]:[display:flex] [&_div]:[align-items:center] [&_div]:[justify-content:space-between] [&_div]:[gap:var(--space-3)] [&_span]:[color:var(--text-secondary)] [&_span]:[font-size:0.72rem] [&_span]:[text-transform:uppercase] [&_strong]:[margin:0] [&_strong]:[color:var(--text-primary)] [&_strong]:font-mono [display:grid] [gap:var(--space-3)]">
          <div>
            <span>Total</span>
            <strong>{trades.length}</strong>
          </div>
          <div>
            <span>Filtered</span>
            <strong>{filteredTrades.length}</strong>
          </div>
          <div>
            <span>Closed</span>
            <strong>{trades.filter((trade) => String(trade.status).toUpperCase() === 'CLOSED').length}</strong>
          </div>
        </div>
        <p>Closed rows should carry thesis and post-mortem notes so Analytics can learn from realized outcomes.</p>
      </aside>

      <TradeLogDrawer
        getToken={getToken}
        onClose={() => setDrawerOpen(false)}
        onSaved={loadData}
        open={drawerOpen}
        suggestions={suggestions}
        submitTrade={fetchWithAuth}
      />
    </div>
  );
}
