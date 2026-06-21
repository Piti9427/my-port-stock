import PropTypes from 'prop-types';

export function JournalFilters({ filters, modeOptions, tickerOptions, onFilterChange, onReset }) {
  return (
    <div className="journal-filters" aria-label="Journal filters">
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
      <button className="btn-secondary" type="button" onClick={onReset}>
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
