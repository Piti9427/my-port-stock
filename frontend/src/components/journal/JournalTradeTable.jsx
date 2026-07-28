import PropTypes from 'prop-types';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Fragment } from 'react';
import { Link } from 'react-router';
import { cn } from '../../lib/utils.js';
import { EmptyState } from '../ui/EmptyState.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';
import { formatCurrency, formatDate, statusLabel } from './journalFormatters.js';

const COLUMNS = [
  { key: 'date', label: 'Date' },
  { key: 'ticker', label: 'Ticker' },
  { key: 'type', label: 'Type' },
  { key: 'shares', label: 'Shares' },
  { key: 'price', label: 'Price' },
  { key: 'mode', label: 'Mode' },
  { key: 'status', label: 'Status' },
  { key: 'profit', label: 'P/L' },
];

const BADGE_CLASS = 'inline-flex min-h-6 items-center rounded-sm border border-border-subtle px-2.5 text-xs font-extrabold text-text-secondary';
const TYPE_CLASSES = {
  buy: 'border-fin-profit text-fin-profit',
  sell: 'border-fin-loss text-fin-loss',
};
const STATUS_CLASSES = {
  open: 'border-fin-profit text-fin-profit',
  stopped_out: 'border-fin-loss text-fin-loss',
  closed: 'text-foreground',
};

function sortIndicator(sort, key) {
  if (sort.key !== key) return null;
  return sort.direction === 'asc' ? <ChevronUp size={13} aria-hidden="true" /> : <ChevronDown size={13} aria-hidden="true" />;
}

function profitClass(value) {
  const numeric = Number(value);
  if (numeric > 0) return 'text-fin-profit';
  if (numeric < 0) return 'text-fin-loss';
  return 'text-text-secondary';
}

export function JournalTradeTable({ emptyAction, emptyDescription, expandedTradeId, loading, onExpandTrade, onSortChange, sort, trades }) {
  if (loading) {
    return <Skeleton variant="table" rows={5} columns={8} />;
  }

  if (trades.length === 0) {
    return <EmptyState title="ไม่มีบันทึกการเทรด" description={emptyDescription} action={emptyAction} />;
  }

  return (
    <div className="min-h-0 overflow-auto rounded-md border border-border-subtle pb-1.5 max-[640px]:overflow-visible [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border-medium [&::-webkit-scrollbar-thumb:hover]:bg-border-strong [&::-webkit-scrollbar-track]:bg-transparent">
      <table className="w-full min-w-[860px] border-collapse max-[640px]:min-w-0 [&_td]:border-b [&_td]:border-border-subtle [&_td]:px-4 [&_td]:py-3.5 [&_td]:text-left [&_td]:text-[0.82rem] [&_td]:text-text-secondary [&_th]:border-b [&_th]:border-border-subtle [&_th]:px-4 [&_th]:py-3.5 [&_th]:text-left [&_th]:text-[0.82rem] [&_th]:text-text-secondary [&_th_button]:inline-flex [&_th_button]:items-center [&_th_button]:gap-1 [&_th_button]:border-0 [&_th_button]:bg-transparent [&_th_button]:font-inherit [&_th_button]:text-inherit">
        <thead className="max-[640px]:hidden">
          <tr>
            {COLUMNS.map((column) => (
              <th key={column.key}>
                <button type="button" onClick={() => onSortChange(column.key)}>
                  {column.label}
                  {sortIndicator(sort, column.key)}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => {
            const isExpanded = expandedTradeId === trade.id;
            return (
              <Fragment key={trade.id}>
                <tr
                  className="cursor-pointer hover:bg-brand-dim focus:bg-brand-dim focus:outline-none max-[640px]:grid max-[640px]:gap-2 max-[640px]:border-b max-[640px]:border-border-subtle max-[640px]:bg-panel-solid max-[640px]:p-4 max-[640px]:[&_td]:flex max-[640px]:[&_td]:min-h-8 max-[640px]:[&_td]:items-center max-[640px]:[&_td]:justify-between max-[640px]:[&_td]:gap-3 max-[640px]:[&_td]:border-b-0 max-[640px]:[&_td]:p-0 max-[640px]:[&_td]:text-right max-[640px]:[&_td::before]:shrink-0 max-[640px]:[&_td::before]:text-[0.68rem] max-[640px]:[&_td::before]:font-extrabold max-[640px]:[&_td::before]:uppercase max-[640px]:[&_td::before]:text-text-secondary max-[640px]:[&_td::before]:content-[attr(data-label)]"
                  tabIndex={0}
                  onClick={() => onExpandTrade(trade)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onExpandTrade(trade);
                    }
                  }}
                >
                  <td className="font-mono" data-label="Date">
                    {formatDate(trade.date || trade.created_at)}
                  </td>
                  <td data-label="Ticker">
                    <Link
                      className="[color:var(--brand-primary)] [text-decoration:none] hover:[color:var(--fin-profit)] hover:[outline:none] focus-visible:[color:var(--fin-profit)] focus-visible:[outline:none]"
                      to={`/ticker/${trade.ticker}`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {trade.ticker}
                    </Link>
                  </td>
                  <td data-label="Type">
                    <span className={cn(BADGE_CLASS, TYPE_CLASSES[String(trade.type).toLowerCase()])}>{trade.type || 'TRADE'}</span>
                  </td>
                  <td className="font-mono" data-label="Shares">
                    {trade.shares ?? '—'}
                  </td>
                  <td className="font-mono [font-size:0.92rem]" data-label="Price">
                    {formatCurrency(trade.price ?? trade.entry)}
                  </td>
                  <td data-label="Mode">
                    <span className={BADGE_CLASS}>{trade.mode || 'N/A'}</span>
                  </td>
                  <td data-label="Status">
                    <span className={cn(BADGE_CLASS, STATUS_CLASSES[String(trade.status || 'OPEN').toLowerCase()])}>{statusLabel(trade.status)}</span>
                  </td>
                  <td className={cn('font-mono text-[0.92rem]', profitClass(trade.profit))} data-label="P/L">
                    {Number.isFinite(Number(trade.profit)) ? formatCurrency(trade.profit) : '—'}
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="[&_td]:bg-surface [&_td]:p-0 max-[640px]:-mt-2 max-[640px]:[&_td]:block">
                    <td colSpan={8}>
                      <div className="grid grid-cols-3 gap-5 p-5 max-[1100px]:grid-cols-1 [&_dd]:m-0 [&_dd]:font-mono [&_dd]:text-foreground [&_dl]:grid [&_dl]:gap-2 [&_dl_div]:flex [&_dl_div]:items-center [&_dl_div]:justify-between [&_dl_div]:gap-3 [&_dt]:text-xs [&_dt]:uppercase [&_dt]:text-text-secondary [&_h3]:mb-2 [&_h3]:text-[0.82rem] [&_h3]:text-foreground [&_p]:leading-relaxed [&_p]:text-text-secondary">
                        <section>
                          <h3>Original thesis</h3>
                          <p>{trade.notes || 'No thesis recorded.'}</p>
                          {trade.cognitive_bias && (
                            <div className="mt-3">
                              <strong>Cognitive Bias Tag: </strong>
                              <span className="rounded border border-fin-warning bg-fin-warning-dim px-1.5 py-0.5 font-mono text-xs font-bold text-fin-warning">
                                🧠 {trade.cognitive_bias}
                              </span>
                            </div>
                          )}
                        </section>
                        <section>
                          <h3>Entry / exit</h3>
                          <dl>
                            <div>
                              <dt>Entry</dt>
                              <dd className="font-mono">{formatCurrency(trade.entry ?? trade.price)}</dd>
                            </div>
                            <div>
                              <dt>Target</dt>
                              <dd className="font-mono">{formatCurrency(trade.target)}</dd>
                            </div>
                            <div>
                              <dt>Stop</dt>
                              <dd className="font-mono">{formatCurrency(trade.stop_loss)}</dd>
                            </div>
                            <div>
                              <dt>R/R</dt>
                              <dd className="font-mono">{trade.risk_reward || '—'}</dd>
                            </div>
                          </dl>
                        </section>
                        <section>
                          <h3>Post-mortem</h3>
                          <p>
                            {trade.source_note ||
                              (String(trade.status).toUpperCase() === 'CLOSED'
                                ? 'Closed trade needs lessons learned.'
                                : 'Post-mortem available after close.')}
                          </p>
                          <Link to={`/command-center?ticker=${encodeURIComponent(trade.ticker)}`}>Open related analysis</Link>
                        </section>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

JournalTradeTable.propTypes = {
  emptyAction: PropTypes.shape({ label: PropTypes.string.isRequired, onClick: PropTypes.func.isRequired }),
  emptyDescription: PropTypes.string.isRequired,
  expandedTradeId: PropTypes.string,
  loading: PropTypes.bool,
  onExpandTrade: PropTypes.func.isRequired,
  onSortChange: PropTypes.func.isRequired,
  sort: PropTypes.shape({ key: PropTypes.string, direction: PropTypes.oneOf(['asc', 'desc']) }).isRequired,
  trades: PropTypes.arrayOf(PropTypes.object).isRequired,
};
