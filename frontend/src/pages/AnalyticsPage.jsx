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
import { cn } from '../lib/utils.js';

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
    <div className="[flex:1_1_auto] [min-height:0] [overflow-y:auto] [padding:24px_28px] [display:flex] [flex-direction:column] [gap:16px] max-[768px]:![overflow-y:visible] max-[768px]:![height:auto] max-[768px]:![min-height:0]">
      <header className="rounded-lg border border-border bg-panel p-5 sm:p-6 shadow-none [display:grid] [gap:var(--space-4)] [&_h2]:[margin:0] [&_h2]:[font-size:1.2rem] [&_p]:[margin:6px_0_0] [&_p]:[color:var(--text-secondary)] [&_p]:[font-size:var(--font-size-sm)]">
        <div className="[display:flex] [align-items:flex-start] [justify-content:space-between] [gap:var(--space-4)]">
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
        <div className="[display:grid] [gap:var(--space-4)]">
          <div className="rounded-lg border border-border bg-panel px-6 py-8 shadow-none">
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

          <section className="my-4 rounded-lg border border-border bg-panel shadow-none" aria-labelledby="analytics-biases-title">
            <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-6 py-4 max-[640px]:flex-col max-[640px]:items-start">
              <span id="analytics-biases-title" className="mb-0.5 text-[0.95rem] font-semibold text-foreground">
                🧠 Cognitive Bias Analysis
              </span>
            </div>
            <div className="flex-1 overflow-y-auto max-[640px]:overflow-x-auto [&_table]:w-full [&_table]:border-collapse [&_td]:border-b [&_td]:border-border-subtle [&_td]:px-6 [&_td]:py-3.5 [&_td:last-child]:pr-6 [&_td:last-child]:text-right [&_th]:sticky [&_th]:top-0 [&_th]:border-b [&_th]:border-border-medium [&_th]:bg-panel-solid [&_th]:px-6 [&_th]:py-2.5 [&_th]:text-left [&_th]:text-[0.7rem] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-[0.08em] [&_th]:text-text-secondary [&_th:last-child]:pr-6 [&_th:last-child]:text-right max-[640px]:[&_table]:min-w-[620px]">
              <table>
                <thead>
                  <tr>
                    <th>Bias Tag</th>
                    <th>Trade Count</th>
                    <th>Win Ratio</th>
                    <th>Net Return</th>
                  </tr>
                </thead>
                <tbody>
                  {biasStats.map((stat) => (
                    <tr key={stat.bias} className="cursor-pointer transition-colors hover:bg-surface-hover">
                      <td className={cn('font-bold', stat.bias === 'None / Not tagged' ? 'text-text-secondary' : 'text-[var(--color-bias-tag)]')}>
                        {stat.bias}
                      </td>
                      <td>{stat.count} trades</td>
                      <td>{stat.count > 0 ? ((stat.winCount / stat.count) * 100).toFixed(0) : 0}%</td>
                      <td className={stat.profit >= 0 ? 'text-fin-profit font-mono text-[0.92rem]' : 'text-fin-loss font-mono text-[0.92rem]'}>
                        {formatMoney(stat.profit, { sign: true })} Net
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section
            className="rounded-lg border border-border bg-panel shadow-none [display:flex] [flex-direction:column]"
            aria-labelledby="analytics-history-title"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-6 py-4 max-[640px]:flex-col max-[640px]:items-start">
              <span id="analytics-history-title" className="mb-0.5 text-[0.95rem] font-semibold text-foreground">
                Closed trade history
              </span>
            </div>
            <div className="flex-1 overflow-y-auto max-[640px]:overflow-x-auto [&_table]:w-full [&_table]:border-collapse [&_td]:border-b [&_td]:border-border-subtle [&_td]:px-6 [&_td]:py-3.5 [&_td:last-child]:pr-6 [&_td:last-child]:text-right [&_th]:sticky [&_th]:top-0 [&_th]:border-b [&_th]:border-border-medium [&_th]:bg-panel-solid [&_th]:px-6 [&_th]:py-2.5 [&_th]:text-left [&_th]:text-[0.7rem] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-[0.08em] [&_th]:text-text-secondary [&_th:last-child]:pr-6 [&_th:last-child]:text-right max-[640px]:[&_table]:min-w-[620px] [&_tr]:cursor-pointer [&_tr]:transition-colors [&_tr:hover]:bg-surface-hover">
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
                    <tr key={trade.id || `${trade.ticker}-${tradeTime(trade)}`} className="cursor-pointer transition-colors hover:bg-surface-hover">
                      <td>{trade.ticker}</td>
                      <td>{trade.mode || '—'}</td>
                      <td>{formatDate(trade.date || trade.closed_at || trade.created_at)}</td>
                      <td
                        className={
                          Number(trade.profit) >= 0 ? 'text-fin-profit font-mono [font-size:0.92rem]' : 'text-fin-loss font-mono [font-size:0.92rem]'
                        }
                      >
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
