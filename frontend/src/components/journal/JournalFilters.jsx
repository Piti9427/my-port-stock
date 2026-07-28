import PropTypes from 'prop-types';

export function JournalFilters({ filters, modeOptions, tickerOptions, onFilterChange, onReset }) {
  return (
    <div
      className="grid grid-cols-[repeat(5,minmax(120px,1fr))_auto] items-end gap-3 max-[1100px]:grid-cols-3 max-[700px]:grid-cols-1 [&_label]:grid [&_label]:gap-2 [&_label]:text-xs [&_label]:font-bold [&_label]:text-text-secondary [&_select]:min-h-10 [&_select]:w-full [&_select]:rounded-sm [&_select]:border [&_select]:border-border-subtle [&_select]:bg-panel [&_select]:px-3 [&_select]:py-2 [&_select]:text-sm [&_select]:text-foreground"
      aria-label="Journal filters"
    >
      <label>
        <span>Ticker</span>
        <select aria-label="Ticker filter" value={filters.ticker} onChange={(event) => onFilterChange('ticker', event.target.value)}>
          <option value="ALL">All tickers</option>
          {tickerOptions.map((ticker) => (
            <option key={ticker} value={ticker}>
              {ticker}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Mode</span>
        <select aria-label="Mode filter" value={filters.mode} onChange={(event) => onFilterChange('mode', event.target.value)}>
          <option value="ALL">All modes</option>
          {modeOptions.map((mode) => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Status</span>
        <select aria-label="Status filter" value={filters.status} onChange={(event) => onFilterChange('status', event.target.value)}>
          <option value="ALL">All statuses</option>
          <option value="OPEN">Active</option>
          <option value="CLOSED">Closed</option>
          <option value="STOPPED_OUT">Stopped Out</option>
        </select>
      </label>
      <label>
        <span>From</span>
        <input aria-label="Start date filter" type="date" value={filters.start} onChange={(event) => onFilterChange('start', event.target.value)} />
      </label>
      <label>
        <span>To</span>
        <input aria-label="End date filter" type="date" value={filters.end} onChange={(event) => onFilterChange('end', event.target.value)} />
      </label>
      <button
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border border-border-subtle bg-transparent px-5 py-2.5 font-sans text-sm font-semibold text-text-secondary transition-colors hover:border-border-hover hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:text-text-muted"
        type="button"
        onClick={onReset}
      >
        Reset
      </button>
    </div>
  );
}

JournalFilters.propTypes = {
  filters: PropTypes.shape({
    ticker: PropTypes.string,
    mode: PropTypes.string,
    status: PropTypes.string,
    start: PropTypes.string,
    end: PropTypes.string,
  }).isRequired,
  modeOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
  tickerOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
  onFilterChange: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
};
