import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { useAuth } from '../auth/clerkAdapter';
import { useJournal } from '../hooks/useJournal';
import { usePortfolio } from '../hooks/usePortfolio';
import { useWatchlist } from '../hooks/useWatchlist';
import { fetchWithAuth } from '../lib/api';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { JournalFilters } from '../components/journal/JournalFilters.jsx';
import { JournalTradeTable } from '../components/journal/JournalTradeTable.jsx';
import { TradeLogDrawer } from '../components/journal/TradeLogDrawer.jsx';
import { DataStamp } from '../components/ui/DataStamp.jsx';

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
  return {
    key: searchParams.get('sort_key') || 'date',
    direction: searchParams.get('sort_dir') === 'asc' ? 'asc' : 'desc',
  };
}

function matchesFilters(trade, filters) {
  const tickerOk = filters.ticker === 'ALL' || normalizeTicker(trade.ticker) === filters.ticker;
  const modeOk = filters.mode === 'ALL' || trade.mode === filters.mode;
  const isClosed = trade.status === 'CLOSED' || trade.status === 'closed' || Boolean(trade.closed_at);
  const statusOk = filters.status === 'ALL' || (filters.status === 'OPEN' ? !isClosed : isClosed);
  const time = dateValue(trade);
  const startOk = !filters.start || time >= new Date(filters.start).getTime();
  const endOk = !filters.end || time <= new Date(`${filters.end}T23:59:59`).getTime();
  return tickerOk && modeOk && statusOk && startOk && endOk;
}

export default function JournalPage() {
  const { getToken } = useAuth();
  const journal = useJournal({ getToken });
  const portfolio = usePortfolio({ getToken });
  const watchlist = useWatchlist({ getToken });

  const [searchParams, setSearchParams] = useSearchParams();
  const filters = parseFilters(searchParams);
  const sort = parseSort(searchParams);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [expandedTradeId, setExpandedTradeId] = useState(null);
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    const rawAction = searchParams.get('action');

    if (rawAction === 'new' && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      setIsDrawerOpen(true);

      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.delete('action');
        return next;
      });
    }
  }, [searchParams, setSearchParams]);

  const filteredTrades = useMemo(
    () => journal.trades.filter((trade) => matchesFilters(trade, filters)).sort((left, right) => compareTrades(left, right, sort)),
    [filters, journal.trades, sort]
  );

  const tickerOptions = useMemo(() => uniqueSorted(journal.trades.map((trade) => normalizeTicker(trade.ticker))), [journal.trades]);
  const modeOptions = useMemo(() => uniqueSorted(journal.trades.map((trade) => trade.mode)), [journal.trades]);
  const suggestions = useMemo(
    () => uniqueSorted([...portfolio.holdings.map((h) => h.ticker), ...watchlist.items.map((w) => w.ticker)]),
    [portfolio.holdings, watchlist.items]
  );

  const updateSearch = (updater) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      updater(next);
      return next;
    });
  };

  const handleFilterChange = (key, value) => {
    updateSearch((next) => {
      if (!value || value === 'ALL') next.delete(key);
      else next.set(key, value);
    });
  };

  const handleResetFilters = () => {
    updateSearch((next) => {
      ['ticker', 'mode', 'status', 'start', 'end'].forEach((key) => next.delete(key));
    });
  };

  const handleToggleSort = (key) => {
    const next = nextSort(sort, key);
    updateSearch((params) => {
      params.set('sort_key', next.key);
      params.set('sort_dir', next.direction);
    });
  };

  const handleNewLog = () => {
    setIsDrawerOpen(true);
  };

  const handleSaveSuccess = async () => {
    setIsDrawerOpen(false);
    await journal.refetch();
  };

  const emptyCopy = journal.trades.length === 0 ? 'บันทึกเทรดครั้งแรกเพื่อเริ่มติดตาม' : 'ไม่มีรายการเทรดที่ตรงกับเงื่อนไข filter ที่เลือกไว้';

  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full bg-neutral-950 text-neutral-100">
      <header className="p-6 border border-neutral-800 rounded-xl bg-neutral-900/60 backdrop-blur-sm flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-neutral-100">Trade Journal & Audit Log</h2>
          <p className="text-xs text-neutral-400 mt-1">Audit log of open decisions and historical trade executions.</p>
        </div>
        <div className="flex items-center gap-3">
          <DataStamp source={journal.meta?.source || 'Supabase trade journal'} timestamp={journal.meta?.as_of} stale={journal.isStale} />
          <button
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-500 text-neutral-950 hover:bg-emerald-400 transition-colors"
            type="button"
            onClick={handleNewLog}
          >
            <Plus size={14} aria-hidden="true" />
            Log trade
          </button>
        </div>
      </header>

      <section className="p-6 border border-neutral-800 rounded-xl bg-neutral-900/60 backdrop-blur-sm flex flex-col gap-4">
        <JournalFilters
          filters={filters}
          modeOptions={modeOptions}
          tickerOptions={tickerOptions}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilters}
        />

        {journal.error ? (
          <EmptyState
            title="Unable to load trade journal"
            description={journal.error.message || 'Connecting to Supabase trade journal failed.'}
            action={{ label: 'Retry', onClick: journal.refetch }}
          />
        ) : filteredTrades.length === 0 && !journal.loading ? (
          <EmptyState
            title={journal.trades.length === 0 ? 'ยังไม่มีรายการเทรด' : 'No entries found'}
            description={emptyCopy}
            action={{ label: journal.trades.length === 0 ? 'บันทึกเทรดครั้งแรก' : 'Log trade', onClick: handleNewLog }}
          />
        ) : (
          <JournalTradeTable
            trades={filteredTrades}
            sort={sort}
            loading={journal.loading}
            onSortChange={handleToggleSort}
            onExpandTrade={(item) => {
              const id = typeof item === 'object' && item !== null ? item.id : item;
              setExpandedTradeId((curr) => (curr === id ? null : id));
            }}
            expandedTradeId={expandedTradeId}
            emptyDescription={emptyCopy}
            emptyAction={undefined}
          />
        )}
      </section>

      <TradeLogDrawer
        open={isDrawerOpen}
        getToken={getToken}
        onClose={() => setIsDrawerOpen(false)}
        onSaved={handleSaveSuccess}
        suggestions={suggestions}
        submitTrade={fetchWithAuth}
      />
    </div>
  );
}
