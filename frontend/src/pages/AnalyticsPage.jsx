import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/clerkAdapter';
import { AnalyticsFilters } from '../components/analytics/AnalyticsFilters.jsx';
import { buildAnalyticsStats, formatMoney } from '../components/analytics/analyticsCalculations.js';
import { AnalyticsMetricCards } from '../components/analytics/AnalyticsMetricCards.jsx';
import { EquityCurve } from '../components/analytics/EquityCurve.jsx';
import { DataStamp } from '../components/ui/DataStamp.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { useJournal } from '../hooks/useJournal.js';

function normalizeTicker(value) {
  return String(value || '')
    .trim()
    .toUpperCase();
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
}

function tradeTime(trade) {
  const parsed = Date.parse(trade.date || trade.closed_at || trade.created_at);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function parseFilters(searchParams) {
  return {
    ticker: searchParams.get('ticker') || 'ALL',
    mode: searchParams.get('mode') || 'ALL',
    start: searchParams.get('start') || '',
    end: searchParams.get('end') || '',
  };
}

function matchesFilters(trade, filters) {
  const tickerOk = filters.ticker === 'ALL' || normalizeTicker(trade.ticker) === filters.ticker;
  const modeOk = filters.mode === 'ALL' || trade.mode === filters.mode;
  const time = tradeTime(trade);
  const startOk = !filters.start || time >= new Date(filters.start).getTime();
  const endOk = !filters.end || time <= new Date(`${filters.end}T23:59:59`).getTime();
  return tickerOk && modeOk && startOk && endOk;
}

function formatDate(value) {
  if (!value || Number.isNaN(Date.parse(value))) return '—';
  return new Date(value).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function AnalyticsPage() {
  const { getToken } = useAuth();
  const { closedTrades, error, isStale, loading, meta, refetch } = useJournal({ getToken });
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = parseFilters(searchParams);

  const sortedClosedTrades = useMemo(() => [...closedTrades].sort((left, right) => tradeTime(left) - tradeTime(right)), [closedTrades]);
  const filteredClosedTrades = useMemo(() => sortedClosedTrades.filter((trade) => matchesFilters(trade, filters)), [filters, sortedClosedTrades]);
  const stats = useMemo(() => buildAnalyticsStats(filteredClosedTrades), [filteredClosedTrades]);
  const tickerOptions = useMemo(() => uniqueSorted(sortedClosedTrades.map((trade) => normalizeTicker(trade.ticker))), [sortedClosedTrades]);
  const modeOptions = useMemo(() => uniqueSorted(sortedClosedTrades.map((trade) => trade.mode)), [sortedClosedTrades]);

  const setParam = (key, value, defaultValue = 'ALL') => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (!value || value === defaultValue) next.delete(key);
      else next.set(key, value);
      return next;
    });
  };

  const resetFilters = () => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      ['ticker', 'mode', 'start', 'end'].forEach((key) => next.delete(key));
      return next;
    });
  };

  const emptyCopy = sortedClosedTrades.length === 0 ? 'ต้องมี trade ที่ปิดแล้วอย่างน้อย 1 รายการ' : 'ไม่มี trade ที่ตรงกับ filter นี้';

  return (
    <div className="analytics-page">
      <header className="glass-panel analytics-header">
        <div className="analytics-header-top">
          <div>
            <h2>Performance Analytics</h2>
            <p>Review closed-trade outcomes from Supabase journal data.</p>
          </div>
          <DataStamp source={meta.source || 'Supabase journal data'} timestamp={meta.as_of} stale={isStale} />
        </div>
        <AnalyticsFilters
          filters={filters}
          modeOptions={modeOptions}
          tickerOptions={tickerOptions}
          onFilterChange={(key, value) => setParam(key, value, key === 'start' || key === 'end' ? '' : 'ALL')}
          onReset={resetFilters}
        />
      </header>

      {loading ? (
        <Skeleton variant="table" rows={4} columns={5} />
      ) : error ? (
        <EmptyState
          title="Insufficient data"
          description={error.message || 'Connect Supabase data before this panel can calculate.'}
          action={{ label: 'Retry', onClick: refetch }}
        />
      ) : filteredClosedTrades.length === 0 ? (
        <div className="analytics-empty-stack">
          <EmptyState title="Insufficient data" description={emptyCopy} />
          <EquityCurve trades={[]} />
        </div>
      ) : (
        <>
          <AnalyticsMetricCards stats={stats} />
          <EquityCurve trades={filteredClosedTrades} />
          <section className="glass-panel analytics-history" aria-labelledby="analytics-history-title">
            <div className="panel-header">
              <span id="analytics-history-title" className="panel-heading">
                Closed trade history
              </span>
            </div>
            <div className="watchlist-table analytics-history-table">
              <table>
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Mode</th>
                    <th>Date</th>
                    <th>P/L</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClosedTrades.map((trade) => (
                    <tr key={trade.id || `${trade.ticker}-${tradeTime(trade)}`} className="watchlist-row">
                      <td>{trade.ticker}</td>
                      <td>{trade.mode || '—'}</td>
                      <td>{formatDate(trade.date || trade.closed_at || trade.created_at)}</td>
                      <td className={Number(trade.profit) >= 0 ? 'kpi-profit price-mono' : 'kpi-loss price-mono'}>
                        {formatMoney(trade.profit, { sign: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
