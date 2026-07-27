import PropTypes from 'prop-types';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Fragment } from 'react';
import { Link } from 'react-router';
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

function sortIndicator(sort, key) {
  if (sort.key !== key) return null;
  return sort.direction === 'asc' ? <ChevronUp size={13} aria-hidden="true" /> : <ChevronDown size={13} aria-hidden="true" />;
}

function profitClass(value) {
  const numeric = Number(value);
  if (numeric > 0) return 'semantic-positive';
  if (numeric < 0) return 'semantic-negative';
  return 'semantic-neutral';
}

export function JournalTradeTable({ emptyAction, emptyDescription, expandedTradeId, loading, onExpandTrade, onSortChange, sort, trades }) {
  if (loading) {
    return <Skeleton variant="table" rows={5} columns={8} />;
  }

  if (trades.length === 0) {
    return <EmptyState title="ไม่มีบันทึกการเทรด" description={emptyDescription} action={emptyAction} />;
  }

  return (
    <div className="journal-table-wrap">
      <table className="journal-table">
        <thead>
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
                  className="journal-row"
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
                    <Link className="ticker-detail-inline-link" to={`/ticker/${trade.ticker}`} onClick={(event) => event.stopPropagation()}>
                      {trade.ticker}
                    </Link>
                  </td>
                  <td data-label="Type">
                    <span className={`journal-type ${String(trade.type).toLowerCase()}`}>{trade.type || 'TRADE'}</span>
                  </td>
                  <td className="font-mono" data-label="Shares">
                    {trade.shares ?? '—'}
                  </td>
                  <td className="price-mono" data-label="Price">
                    {formatCurrency(trade.price ?? trade.entry)}
                  </td>
                  <td data-label="Mode">
                    <span className="journal-mode-badge">{trade.mode || 'N/A'}</span>
                  </td>
                  <td data-label="Status">
                    <span className={`journal-status-badge ${String(trade.status || 'OPEN').toLowerCase()}`}>{statusLabel(trade.status)}</span>
                  </td>
                  <td className={`price-mono ${profitClass(trade.profit)}`} data-label="P/L">
                    {Number.isFinite(Number(trade.profit)) ? formatCurrency(trade.profit) : '—'}
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="journal-detail-row">
                    <td colSpan={8}>
                      <div className="journal-detail-grid">
                        <section>
                          <h3>Original thesis</h3>
                          <p>{trade.notes || 'No thesis recorded.'}</p>
                          {trade.cognitive_bias && (
                            <div style={{ marginTop: '12px' }}>
                              <strong>Cognitive Bias Tag: </strong>
                              <span
                                style={{
                                  background: '#271c0c',
                                  color: '#fb923c',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  border: '1px solid #7c2d12',
                                  fontFamily: 'monospace',
                                  fontSize: '0.75rem',
                                  fontWeight: 'bold',
                                }}
                              >
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
