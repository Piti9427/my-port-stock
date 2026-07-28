import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, BookOpen, Brain } from 'lucide-react';
import { useAuth } from '../auth/clerkAdapter';
import { DataStamp } from '../components/ui/DataStamp';
import { EmptyState } from '../components/ui/EmptyState';
import { MetricCard } from '../components/ui/MetricCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ScenarioPlanner } from '../components/ScenarioPlanner';
import { fetchWithAuth } from '../lib/api';
import { formatCurrency } from '../lib/format';
import { useApi } from '../hooks/useApi';

const DEFAULT_DECISION_MODE = 'Swing Trade';

function normalizeSymbol(symbol) {
  return String(symbol || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9.-]/g, '')
    .slice(0, 10);
}

function formatPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  return `${(numeric * 100).toFixed(2)}%`;
}

function formatNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  return numeric.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function formatGateStatus(value) {
  const gate = String(value || 'fail').toLowerCase();
  return gate === 'pass' ? 'Pass' : 'Fail';
}

function firstHolding(packet) {
  return packet?.portfolio_context?.holdings_rows?.[0] || null;
}

function tradeRows(packet, journalPayload) {
  if (Array.isArray(packet?.journal_context?.trade_rows)) return packet.journal_context.trade_rows;
  if (Array.isArray(journalPayload?.trades)) return journalPayload.trades;
  return [];
}

function priceSources(quotePayload, packetPayload) {
  const sources = quotePayload?.price_sources || packetPayload?.price_sources || [];
  return Array.isArray(sources) ? sources : [];
}

function isInsufficient(...payloads) {
  return payloads.some((payload) => payload?.status === 'INSUFFICIENT_DATA');
}

export default function TickerDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const symbol = useMemo(() => normalizeSymbol(params.symbol), [params.symbol]);
  const { getToken } = useAuth();

  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const [showScenarioPlanner, setShowScenarioPlanner] = useState(false);

  const fetchQuote = useCallback(() => fetchWithAuth(`/api/quote?ticker=${encodeURIComponent(symbol)}`, getToken), [getToken, symbol]);
  const fetchPacket = useCallback(
    () => fetchWithAuth(`/api/data-packet?ticker=${encodeURIComponent(symbol)}&decision_mode=${encodeURIComponent(DEFAULT_DECISION_MODE)}`, getToken),
    [getToken, symbol]
  );
  const fetchJournal = useCallback(() => fetchWithAuth(`/api/journal?ticker=${encodeURIComponent(symbol)}`, getToken), [getToken, symbol]);

  const quote = useApi(fetchQuote, { enabled: Boolean(symbol) });
  const packet = useApi(fetchPacket, { enabled: Boolean(symbol) });
  const journal = useApi(fetchJournal, { enabled: Boolean(symbol) });

  const loading = quote.loading || packet.loading || journal.loading;
  const requestError = quote.error || packet.error || journal.error;

  const quotePayload = quote.data || {};
  const packetPayload = packet.data || {};
  const journalPayload = journal.data || {};

  const holding = useMemo(() => firstHolding(packetPayload), [packetPayload]);
  const trades = useMemo(() => tradeRows(packetPayload, journalPayload), [journalPayload, packetPayload]);
  const sources = useMemo(() => priceSources(quotePayload, packetPayload), [packetPayload, quotePayload]);
  const gateStatus = formatGateStatus(quotePayload.gate || packetPayload.gate);
  const insufficient = isInsufficient(quotePayload, packetPayload, journalPayload);

  const piotroski = packetPayload.fundamental_packet?.piotroski_f_score;
  const altman = packetPayload.fundamental_packet?.altman_z_score;
  const roce = packetPayload.fundamental_packet?.roce;
  const avwap = packetPayload.technical_packet?.anchored_vwap;
  const earningsDate = packetPayload.fundamental_packet?.next_earnings_date;
  const contextSource = packetPayload.portfolio_context?.source;

  const nextEarningsStr = packetPayload.fundamental_packet?.next_earnings_date;
  const earningsProximityWarning = useMemo(() => {
    if (!nextEarningsStr) return null;
    const parts = nextEarningsStr.split('-');
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const targetDate = new Date(year, month, day);

    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const diffTime = targetDate.getTime() - todayMidnight.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays <= 5) {
      return `⚠️ Earnings in ${diffDays} days — max 30% test position only`;
    }
    return null;
  }, [nextEarningsStr]);

  const runAnalysis = useCallback(async () => {
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const result = await fetchWithAuth('/api/analyze', getToken, {
        method: 'POST',
        body: { ticker: symbol, decision_mode: DEFAULT_DECISION_MODE },
      });
      setAnalysis(result);
    } catch (error) {
      setAnalysisError(error.message || 'Connection failed');
    } finally {
      setAnalyzing(false);
    }
  }, [getToken, symbol]);

  if (!symbol) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <EmptyState title="Invalid ticker" description="Use a valid ticker symbol to open drilldown." />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col gap-6 max-w-6xl mx-auto w-full bg-neutral-950 text-neutral-100">
      <header className="p-6 border border-neutral-800 rounded-xl bg-neutral-900/60 backdrop-blur-sm flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <Link className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-200 transition-colors" to="/">
            <ArrowLeft size={14} aria-hidden="true" />
            Dashboard
          </Link>
          <DataStamp source="Display-only quote" timestamp={quotePayload.quote_timestamp || packetPayload.quote_timestamp} />
        </div>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-neutral-100">${symbol}</h2>
            <div className="text-xs text-neutral-400 mt-0.5">{holding?.name || 'Ticker drilldown'}</div>
          </div>
          <StatusBadge status={gateStatus === 'Pass' ? 'buy' : 'wait'} label={`Gate: ${gateStatus}`} />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-emerald-400">
            {formatCurrency(quotePayload.last_price || packetPayload.last_price, symbol)}
          </span>
          <span className="text-xs text-neutral-500">Display-only quote, not execution-ready unless the price gate passes.</span>
        </div>
      </header>

      {!loading && earningsProximityWarning && (
        <div className="p-3 border border-orange-900/60 bg-amber-950/40 text-orange-400 rounded-lg font-mono text-xs">{earningsProximityWarning}</div>
      )}

      {loading && (
        <section className="p-8 border border-neutral-800 rounded-xl bg-neutral-900/40 text-center text-sm text-neutral-400" aria-live="polite">
          Loading ticker detail...
        </section>
      )}

      {!loading && requestError && (
        <section className="p-8 border border-neutral-800 rounded-xl bg-neutral-900/40" role="alert">
          <EmptyState
            title="Ticker detail unavailable"
            description={requestError.message || 'Authenticated ticker context could not be loaded.'}
            action={{
              label: 'Retry',
              onClick: () => {
                quote.refetch();
                packet.refetch();
                journal.refetch();
              },
            }}
          />
        </section>
      )}

      {!loading && insufficient && (
        <section className="p-8 border border-neutral-800 rounded-xl bg-neutral-900/40 text-center" role="status">
          <StatusBadge status="wait" label="Wait" />
          <div className="text-base font-bold text-neutral-200 mt-2 mb-1">INSUFFICIENT_DATA</div>
          <p className="text-xs text-neutral-400">
            {quotePayload.error_details || packetPayload.error_details || journalPayload.error_details || 'Runtime context unavailable.'}
          </p>
        </section>
      )}

      {!loading && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            label="Last Price"
            value={formatCurrency(quotePayload.last_price || packetPayload.last_price, symbol)}
            dataStamp="Display-only quote"
            mono
          />
          <MetricCard
            label="Position"
            value={holding ? `Held (${holding.status || 'CLOSED'})` : 'Not held'}
            change={holding?.status || 'CLOSED'}
            changeType="neutral"
            dataStamp="Supabase holdings"
          />
          <MetricCard label="Journal Rows" value={String(trades.length)} dataStamp="Supabase journal" mono />
        </section>
      )}

      {!loading && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            label="Piotroski F-Score"
            value={piotroski !== null && piotroski !== undefined ? `${piotroski}/9` : '—'}
            dataStamp="Oracle F-Score"
            mono
          />
          <MetricCard
            label="Altman Z-Score"
            value={altman !== null && altman !== undefined ? altman.toFixed(2) : '—'}
            change={altman !== null && altman < 1.81 ? 'DISTRESS' : altman > 2.99 ? 'SAFE' : 'GRAY'}
            changeType={altman !== null && altman < 1.81 ? 'negative' : altman > 2.99 ? 'positive' : 'neutral'}
            dataStamp="Oracle Z-Score"
            mono
          />
          <MetricCard label="ROCE" value={formatPercent(roce)} dataStamp="Capital efficiency" mono />
        </section>
      )}

      {!loading && (
        <section className="p-6 border border-neutral-800 rounded-xl bg-neutral-900/60 backdrop-blur-sm flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <span className="text-sm font-bold text-neutral-200">Authenticated Runtime Context</span>
            <DataStamp source={contextSource === 'supabase' ? 'Supabase per-user context' : 'Supabase context unavailable'} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <div className="text-neutral-500 mb-1">Shares</div>
              <div className="font-mono text-base font-bold text-neutral-200">{formatNumber(holding?.shares)}</div>
            </div>
            <div>
              <div className="text-neutral-500 mb-1">Average Cost</div>
              <div className="font-mono text-base font-bold text-neutral-200">{formatCurrency(holding?.avg_cost, symbol)}</div>
            </div>
            <div>
              <div className="text-neutral-500 mb-1">Source</div>
              <div className="text-base font-bold text-neutral-200">{contextSource || 'unavailable'}</div>
            </div>
          </div>
        </section>
      )}

      {analysis && (
        <section className="p-6 border border-neutral-800 rounded-xl bg-neutral-900/60 backdrop-blur-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-neutral-100">Latest Analysis</h3>
            <button
              className="px-3 py-1.5 text-xs font-semibold rounded-md border border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700 transition-colors"
              type="button"
              onClick={() => setShowScenarioPlanner(true)}
            >
              เปิด Scenario Planner
            </button>
          </div>
          <div className="text-xs text-neutral-300 whitespace-pre-wrap">{analysis.analysis || JSON.stringify(analysis)}</div>
        </section>
      )}

      {!loading && trades.length > 0 && (
        <section className="p-6 border border-neutral-800 rounded-xl bg-neutral-900/60 backdrop-blur-sm flex flex-col gap-4">
          <div className="text-sm font-bold text-neutral-200">Trade History</div>
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-neutral-900 border-b border-neutral-800 text-neutral-400">
                <tr>
                  <th className="p-3">Type</th>
                  <th className="p-3">Shares</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {trades.map((t, idx) => (
                  <tr key={t.id || idx}>
                    <td className="p-3 font-bold">{t.type || 'BUY'}</td>
                    <td className="p-3 font-mono">{t.shares ?? '—'}</td>
                    <td className="p-3 font-mono">{formatCurrency(t.price ?? t.entry, symbol)}</td>
                    <td className="p-3 font-bold">{t.status || 'CLOSED'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!loading && (
        <section className="flex items-center gap-3">
          <button
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-emerald-500 text-neutral-950 hover:bg-emerald-400 transition-colors"
            type="button"
            onClick={runAnalysis}
            disabled={analyzing}
          >
            <Brain size={16} aria-hidden="true" />
            {analyzing ? 'กำลังวิเคราะห์...' : 'วิเคราะห์ Setup'}
          </button>
          <Link
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700 transition-colors"
            to={`/journal?ticker=${encodeURIComponent(symbol)}`}
          >
            <BookOpen size={15} aria-hidden="true" />
            บันทึกเทรด
          </Link>
        </section>
      )}

      <ScenarioPlanner
        open={showScenarioPlanner}
        ticker={symbol}
        holding={holding}
        onClose={() => setShowScenarioPlanner(false)}
        onLogTrade={() => navigate(`/journal?ticker=${encodeURIComponent(symbol)}&action=new`)}
      />
    </div>
  );
}
