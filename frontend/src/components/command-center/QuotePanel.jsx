import PropTypes from 'prop-types';
import { Clock3, RefreshCw } from 'lucide-react';
import { DataStamp } from '../ui/DataStamp.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';

function formatPrice(value, currency = 'USD') {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(number);
}

function formatDelayStatus(value) {
  if (!value) return 'Not reported';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([source, status]) => `${source}: ${status || 'Not reported'}`)
      .join('; ');
  }
  return String(value);
}

export function QuotePanel({ quote, loading = false, error = '', onRetry = null }) {
  if (loading) {
    return (
      <section className="command-panel command-quote-panel" aria-label="Quote loading">
        <Skeleton height="18px" width="38%" />
        <Skeleton height="38px" width="54%" />
        <Skeleton height="56px" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="command-panel command-quote-panel">
        <EmptyState title="Quote unavailable" description={error} action={onRetry ? { label: 'Retry quote', onClick: onRetry } : undefined} />
      </section>
    );
  }

  if (!quote) {
    return (
      <section className="command-panel command-quote-panel">
        <EmptyState title="Load a ticker" description="Quote trust and price-gate evidence will appear here." />
      </section>
    );
  }

  const gatePassed = String(quote.current_price_acceptance_gate).toLowerCase() === 'pass';
  const sources = Array.isArray(quote.price_sources) ? quote.price_sources : [];
  const sourceLabel = sources.length > 0 ? sources.join(' + ') : 'Source unavailable';

  return (
    <section className="command-panel command-quote-panel" aria-labelledby="quote-panel-title">
      <div className="command-panel-heading">
        <div>
          <span className="command-panel-kicker">{gatePassed ? 'Gate-passed quote' : 'Display quote only'}</span>
          <h2 id="quote-panel-title">{quote.ticker || 'Current quote'}</h2>
        </div>
        <DataStamp source={sourceLabel} timestamp={quote.quote_timestamp || quote.as_of} />
      </div>
      <div className="command-quote-price">{formatPrice(quote.last_price, quote.currency || 'USD')}</div>
      <dl className="command-quote-metrics">
        <div>
          <dt>Session</dt>
          <dd>{quote.market_session || 'Unknown'}</dd>
        </div>
        <div className="quote-delay">
          <dt>Delay</dt>
          <dd>{formatDelayStatus(quote.quote_delay_status)}</dd>
        </div>
        <div>
          <dt>Sources</dt>
          <dd>{sources.length || '—'}</dd>
        </div>
      </dl>
      <div className={`command-gate-status ${gatePassed ? 'pass' : 'fail'}`} role={gatePassed ? 'status' : 'alert'}>
        <Clock3 size={15} aria-hidden="true" />
        {gatePassed ? 'Price gate: PASS — dual-source confirmed' : 'Price gate: FAIL — ต้องยืนยัน Tier 1 ก่อน execution'}
      </div>
      {onRetry && (
        <button className="command-icon-action" type="button" onClick={onRetry} title="Refresh quote">
          <RefreshCw size={15} aria-hidden="true" />
          <span>Refresh</span>
        </button>
      )}
    </section>
  );
}

QuotePanel.propTypes = {
  quote: PropTypes.object,
  loading: PropTypes.bool,
  error: PropTypes.string,
  onRetry: PropTypes.func,
};
