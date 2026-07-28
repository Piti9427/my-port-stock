import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, BookOpen, Brain, Clock, Target } from 'lucide-react';
import { useAuth } from '../auth/clerkAdapter';
import { DataStamp } from '../components/ui/DataStamp';
import { DataTable } from '../components/ui/DataTable';
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
  const { symbol: routeSymbol } = useParams();
  const symbol = normalizeSymbol(routeSymbol);
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [analysis, setAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [plannerOpen, setPlannerOpen] = useState(false);

  const quote = useApi(symbol ? `/api/quote/${encodeURIComponent(symbol)}` : null, { getToken, staleMs: 30000 });
  const packet = useApi(symbol ? `/api/packet/${encodeURIComponent(symbol)}?mode=${encodeURIComponent(DEFAULT_DECISION_MODE)}` : null, {
    getToken,
    staleMs: 30000,
  });
  const journal = useApi(symbol ? `/api/journal/${encodeURIComponent(symbol)}` : null, { getToken, staleMs: 30000 });

  const loading = quote.loading || packet.loading || journal.loading;
  const requestError = quote.error || packet.error || journal.error;
  const quotePayload = useMemo(() => quote.data || {}, [quote.data]);
  const packetPayload = useMemo(() => packet.data || {}, [packet.data]);
  const journalPayload = useMemo(() => journal.data || {}, [journal.data]);
  const insufficient = isInsufficient(quotePayload, packetPayload, journalPayload);
  const holding = firstHolding(packetPayload);
  const trades = useMemo(() => tradeRows(packetPayload, journalPayload), [journalPayload, packetPayload]);
  const sources = useMemo(() => priceSources(quotePayload, packetPayload), [quotePayload, packetPayload]);
  const gateStatus = formatGateStatus(quotePayload.current_price_acceptance_gate || packetPayload.current_price_acceptance_gate);
  const contextSource = packetPayload?.portfolio_context?.source || packetPayload?.journal_context?.source;
  const oracle = useMemo(() => packetPayload?.fundamental_packet?.oracle || {}, [packetPayload]);
  const piotroski = oracle.piotroski_f_score;
  const altman = oracle.altman_z_score;
  const roce = oracle.roce;
  const avwap = oracle.anchored_vwap;
  const earningsDate = oracle.latest_past_earnings_date;
  const nextEarningsStr = oracle.next_earnings_date;

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
      <div className="ticker-detail-page">
        <EmptyState title="Invalid ticker" description="Use a valid ticker symbol to open drilldown." />
      </div>
    );
  }

  return (
    <div className="ticker-detail-page">
      <header className="ticker-detail-header glass-panel">
        <div className="ticker-detail-header-top">
          <Link className="ticker-detail-back" to="/">
            <ArrowLeft size={14} aria-hidden="true" />
            Dashboard
          </Link>
          <DataStamp source="Display-only quote" timestamp={quotePayload.quote_timestamp || packetPayload.quote_timestamp} />
        </div>
        <div className="ticker-detail-title-row">
          <div>
            <h2>${symbol}</h2>
            <div className="ticker-detail-subtitle">{holding?.name || 'Ticker drilldown'}</div>
          </div>
          <StatusBadge status={gateStatus === 'Pass' ? 'buy' : 'wait'} label={`Gate: ${gateStatus}`} />
        </div>
        <div className="ticker-detail-price-row">
          <span className="ticker-detail-price font-mono">{formatCurrency(quotePayload.last_price || packetPayload.last_price, symbol)}</span>
          <span className="ticker-detail-copy">Display-only quote, not execution-ready unless the price gate passes.</span>
        </div>
      </header>

      {!loading && earningsProximityWarning && (
        <div
          className="earnings-proximity-banner"
          style={{
            background: '#271c0c',
            color: '#fb923c',
            padding: '12px',
            borderRadius: '4px',
            marginTop: '16px',
            border: '1px solid #7c2d12',
            fontFamily: 'monospace',
            fontSize: '0.85rem',
          }}
        >
          {earningsProximityWarning}
        </div>
      )}

      {loading && (
        <section className="glass-panel ticker-detail-state" aria-live="polite">
          Loading ticker detail...
        </section>
      )}

      {!loading && requestError && (
        <section className="glass-panel ticker-detail-state" role="alert">
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
        <section className="glass-panel ticker-detail-state" role="status">
          <StatusBadge status="wait" label="Wait" />
          <div className="ticker-detail-state-title">INSUFFICIENT_DATA</div>
          <p>{quotePayload.error_details || packetPayload.error_details || journalPayload.error_details || 'Runtime context unavailable.'}</p>
        </section>
      )}

      {!loading && (
        <section className="ticker-detail-grid">
          <MetricCard
            label="Last Price"
            value={formatCurrency(quotePayload.last_price || packetPayload.last_price, symbol)}
            dataStamp="Display-only quote"
            mono
          />
          <MetricCard label="Position" value={holding ? 'Held' : 'Not held'} dataStamp="Supabase holdings" />
          <MetricCard label="Journal Rows" value={String(trades.length)} dataStamp="Supabase journal" mono />
        </section>
      )}

      {!loading && (
        <section className="ticker-detail-grid" style={{ marginTop: 'var(--space-4)' }}>
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

      {!loading && (avwap !== null || analysis?.adaptive_drilldown?.calculated_trailing_stop) && (
        <section className="ticker-detail-grid" style={{ marginTop: 'var(--space-4)' }}>
          {avwap !== null && (
            <MetricCard label="Anchored VWAP" value={formatCurrency(avwap, symbol)} dataStamp={`Anchored from earnings ${earningsDate || ''}`} mono />
          )}
          {analysis?.adaptive_drilldown?.calculated_trailing_stop && (
            <MetricCard
              label="Dynamic Trailing Stop"
              value={formatCurrency(analysis.adaptive_drilldown.calculated_trailing_stop, symbol)}
              dataStamp="🔒 Lock Profit Level (ATR × 1.5)"
              mono
              change="LOCK"
              changeType="positive"
            />
          )}
        </section>
      )}

      {!loading && (
        <section className="glass-panel ticker-detail-context">
          <div className="panel-header">
            <span className="panel-title">Authenticated Runtime Context</span>
            <span className="data-stamp">
              <Clock size={10} aria-hidden="true" />
              <span>{contextSource === 'supabase' ? 'Supabase per-user context' : 'Supabase context unavailable'}</span>
            </span>
          </div>
          <div className="ticker-detail-context-grid">
            <div>
              <div className="ticker-detail-label">Shares</div>
              <div className="ticker-detail-value font-mono">{formatNumber(holding?.shares)}</div>
            </div>
            <div>
              <div className="ticker-detail-label">Average Cost</div>
              <div className="ticker-detail-value font-mono">{formatCurrency(holding?.avg_cost, symbol)}</div>
            </div>
            <div>
              <div className="ticker-detail-label">Source</div>
              <div className="ticker-detail-value">{contextSource || 'unavailable'}</div>
            </div>
          </div>
          {packetPayload.historical_context_warning && <p className="ticker-detail-warning">{packetPayload.historical_context_warning}</p>}
        </section>
      )}

      {!loading && (
        <section className="glass-panel ticker-detail-actions">
          <button className="btn-analyze" type="button" onClick={runAnalysis} disabled={analyzing}>
            <Brain size={16} aria-hidden="true" />
            {analyzing ? 'กำลังวิเคราะห์...' : 'วิเคราะห์ Setup'}
          </button>
          <Link className="btn-secondary ticker-detail-link-button" to={`/journal?ticker=${encodeURIComponent(symbol)}`}>
            <BookOpen size={15} aria-hidden="true" />
            บันทึกเทรด
          </Link>
          <button className="btn-secondary" type="button" onClick={() => setPlannerOpen(true)}>
            <Target size={15} aria-hidden="true" />
            เปิด Scenario Planner
          </button>
        </section>
      )}

      {analysisError && (
        <section className="glass-panel ticker-detail-state" role="alert">
          {analysisError}
        </section>
      )}

      {analysis && (
        <section className="glass-panel ticker-detail-state" role="status">
          <div className="ticker-detail-state-title">Latest Analysis</div>
          <StatusBadge
            status={analysis.decision_snapshot?.verdict || analysis.status || 'wait'}
            label={analysis.decision_snapshot?.verdict || analysis.status || 'Wait'}
          />
        </section>
      )}

      {!loading && (
        <section className="glass-panel ticker-detail-history">
          <div className="panel-header">
            <span className="panel-title">Trade History</span>
            <DataStamp source="Supabase journal filtered by ticker" />
          </div>
          <DataTable
            columns={[
              { key: 'date', label: 'Date', mono: true },
              { key: 'status', label: 'Status' },
              { key: 'entry', label: 'Entry', mono: true, align: 'right' },
              { key: 'stop_loss', label: 'Stop', mono: true, align: 'right' },
            ]}
            data={trades}
            emptyState={{
              title: 'No trade history',
              description: 'No Supabase journal rows exist for this ticker yet.',
            }}
          />
        </section>
      )}

      {!loading && sources.length > 0 && (
        <section className="glass-panel ticker-detail-sources">
          <div className="panel-header">
            <span className="panel-title">Price Sources</span>
            <DataStamp source={quotePayload.market_session || packetPayload.market_session || 'Unknown session'} />
          </div>
          <ul>
            {sources.map((source) => (
              <li key={source}>{source}</li>
            ))}
          </ul>
        </section>
      )}

      <ScenarioPlanner
        open={plannerOpen}
        ticker={symbol}
        holding={holding}
        onClose={() => setPlannerOpen(false)}
        onLogTrade={({ ticker }) => navigate(`/journal?ticker=${encodeURIComponent(ticker)}`)}
      />
    </div>
  );
}
