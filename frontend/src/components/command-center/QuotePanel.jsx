import PropTypes from 'prop-types';
import { Clock3, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils.js';
import { DataStamp } from '../ui/DataStamp.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';

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
  const { t } = useTranslation();
  if (loading) {
    return (
      <section className="min-w-0 overflow-hidden rounded-md border border-border-subtle bg-panel p-5" aria-label="Quote loading">
        <Skeleton height="18px" width="38%" />
        <Skeleton height="38px" width="54%" />
        <Skeleton height="56px" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="min-w-0 overflow-hidden rounded-md border border-border-subtle bg-panel p-5">
        <EmptyState title="Quote unavailable" description={error} action={onRetry ? { label: 'Retry quote', onClick: onRetry } : undefined} />
      </section>
    );
  }

  if (!quote) {
    return (
      <section className="min-w-0 overflow-hidden rounded-md border border-border-subtle bg-panel p-5">
        <EmptyState title="Load a ticker" description="Quote trust and price-gate evidence will appear here." />
      </section>
    );
  }

  const gatePassed = String(quote.current_price_acceptance_gate).toLowerCase() === 'pass';
  const sources = Array.isArray(quote.price_sources) ? quote.price_sources : [];
  const sourceLabel = sources.length > 0 ? sources.join(' + ') : 'Source unavailable';

  return (
    <section className="min-w-0 overflow-hidden rounded-md border border-border-subtle bg-panel p-5" aria-labelledby="quote-panel-title">
      <div className="mb-0.5 text-[0.95rem] font-semibold text-foreground">
        <div>
          <span className="[color:var(--text-secondary)] font-mono [font-size:0.68rem] [text-transform:uppercase]">
            {gatePassed ? 'Gate-passed quote' : 'Display quote only'}
          </span>
          <h2 id="quote-panel-title">{quote.ticker || 'Current quote'}</h2>
        </div>
        <DataStamp source={sourceLabel} timestamp={quote.quote_timestamp || quote.as_of} />
      </div>
      <div className="[margin-bottom:var(--space-4)] [color:var(--text-primary)] font-mono [font-size:2rem] [font-weight:700]">
        {formatPrice(quote.last_price, quote.currency || 'USD')}
      </div>
      <dl className="[display:grid] [grid-template-columns:repeat(3,_minmax(0,_1fr))] [border-top:1px_solid_var(--border-subtle)] [border-bottom:1px_solid_var(--border-subtle)] [&_>_div]:[min-width:0] [&_>_div]:[padding:var(--space-3)] [&_>_div]:[border-right:1px_solid_var(--border-subtle)] [&_>_div:last-child]:[border-right:0] [&_dt]:[color:var(--text-secondary)] [&_dt]:[font-size:0.66rem] [&_dt]:[text-transform:uppercase] [&_dd]:[overflow:hidden] [&_dd]:[margin:4px_0_0] [&_dd]:[color:var(--text-primary)] [&_dd]:font-mono [&_dd]:[font-size:0.74rem] [&_dd]:[text-overflow:ellipsis] [&_dd]:[white-space:nowrap] max-[560px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] max-[560px]:[&_>_div]:[border-bottom:1px_solid_var(--border-subtle)] max-[560px]:[&_>_div:nth-child(odd)]:[border-right:1px_solid_var(--border-subtle)]">
        <div>
          <dt>Session</dt>
          <dd>{quote.market_session || 'Unknown'}</dd>
        </div>
        <div className="max-[560px]:col-span-2 max-[560px]:border-r-0">
          <dt>Delay</dt>
          <dd>{formatDelayStatus(quote.quote_delay_status)}</dd>
        </div>
        <div>
          <dt>Sources</dt>
          <dd>{sources.length || '—'}</dd>
        </div>
      </dl>
      <div
        className={cn(
          'mt-4 flex items-start gap-2 rounded-sm border border-current p-3 text-[0.76rem] leading-[1.45]',
          gatePassed ? 'text-fin-profit' : 'text-fin-loss'
        )}
        role={gatePassed ? 'status' : 'alert'}
      >
        <Clock3 size={15} aria-hidden="true" />
        {gatePassed ? 'Price gate: PASS — dual-source confirmed' : t('command.gate_fail')}
      </div>
      {onRetry && (
        <button
          className="[display:inline-flex] [align-items:center] [gap:var(--space-2)] [margin-top:var(--space-3)] [border:0] [background:transparent] [color:var(--text-secondary)] [cursor:pointer] [font:inherit] [font-size:0.75rem]"
          type="button"
          onClick={onRetry}
          title="Refresh quote"
        >
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
