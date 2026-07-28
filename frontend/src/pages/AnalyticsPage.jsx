import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
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

  const biasStats = useMemo(() => {
    const groups = {};
    for (const trade of filteredClosedTrades) {
      const bias = trade.cognitive_bias || 'None / Not tagged';
      if (!groups[bias]) {
        groups[bias] = { bias, count: 0, profit: 0, winCount: 0 };
      }
      groups[bias].count += 1;
      const profit = Number(trade.profit || 0);
      groups[bias].profit += profit;
      if (profit > 0) {
        groups[bias].winCount += 1;
      }
    }
    return Object.values(groups).sort((a, b) => a.profit - b.profit);
  }, [filteredClosedTrades]);

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
    <div className="flex-1 p-6 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full bg-neutral-950 text-neutral-100">
      <header className="p-6 border border-neutral-800 rounded-xl bg-neutral-900/60 backdrop-blur-sm flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-neutral-100">Performance Analytics</h2>
            <p className="text-xs text-neutral-400 mt-1">Review closed-trade outcomes from Supabase journal data.</p>
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
          description="Connecting to journal analytics failed. Check backend endpoint or retry."
          action={{ label: 'Retry', onClick: refetch }}
        />
      ) : filteredClosedTrades.length === 0 ? (
        <div className="flex flex-col gap-4">
          <div className="p-8 border border-neutral-800 rounded-xl bg-neutral-900/40">
            <EmptyState title="Insufficient data" description={emptyCopy} />
          </div>
          <div className="hidden" aria-hidden="true">
            <EquityCurve trades={[]} />
          </div>
        </div>
      ) : (
        <>
          <AnalyticsMetricCards stats={stats} />
          <EquityCurve trades={filteredClosedTrades} />

          <section className="p-6 border border-neutral-800 rounded-xl bg-neutral-900/60 backdrop-blur-sm" aria-labelledby="analytics-biases-title">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-800">
              <span id="analytics-biases-title" className="text-sm font-bold text-neutral-200">
                🧠 Cognitive Bias Analysis
              </span>
            </div>
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-neutral-900 border-b border-neutral-800 text-neutral-400">
                  <tr>
                    <th className="p-3">Bias Tag</th>
                    <th className="p-3">Trade Count</th>
                    <th className="p-3">Win Ratio</th>
                    <th className="p-3">Net Return</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {biasStats.map((stat) => (
                    <tr key={stat.bias} className="hover:bg-neutral-800/40 transition-colors">
                      <td className={`p-3 font-bold ${stat.bias === 'None / Not tagged' ? 'text-neutral-500' : 'text-orange-400'}`}>{stat.bias}</td>
                      <td className="p-3 text-neutral-300">{stat.count} trades</td>
                      <td className="p-3 font-mono text-neutral-300">{stat.count > 0 ? ((stat.winCount / stat.count) * 100).toFixed(0) : 0}%</td>
                      <td className={`p-3 font-mono font-semibold tabular-nums ${stat.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatMoney(stat.profit, { sign: true })} Net
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="p-6 border border-neutral-800 rounded-xl bg-neutral-900/60 backdrop-blur-sm" aria-labelledby="analytics-history-title">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-800">
              <span id="analytics-history-title" className="text-sm font-bold text-neutral-200">
                Closed trade history
              </span>
            </div>
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-neutral-900 border-b border-neutral-800 text-neutral-400">
                  <tr>
                    <th className="p-3">Ticker</th>
                    <th className="p-3">Mode</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">P/L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {filteredClosedTrades.map((trade) => (
                    <tr key={trade.id || `${trade.ticker}-${tradeTime(trade)}`} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="p-3 font-bold text-neutral-100">{trade.ticker}</td>
                      <td className="p-3 text-neutral-400">{trade.mode || '—'}</td>
                      <td className="p-3 text-neutral-400">{formatDate(trade.date || trade.closed_at || trade.created_at)}</td>
                      <td className={`p-3 font-mono font-semibold tabular-nums ${Number(trade.profit) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
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
