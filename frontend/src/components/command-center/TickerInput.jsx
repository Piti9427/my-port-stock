import PropTypes from 'prop-types';
import { Search } from 'lucide-react';
import { useState } from 'react';

const TICKER_PATTERN = /^[A-Z0-9.-]{1,10}$/;

export function TickerInput({ value, onChange, onSearch, loading = false }) {
  const [error, setError] = useState('');

  const submit = (event) => {
    event.preventDefault();
    const ticker = String(value || '')
      .trim()
      .toUpperCase();
    if (!TICKER_PATTERN.test(ticker)) {
      setError('Enter a valid ticker using letters, numbers, dots, or dashes.');
      return;
    }
    setError('');
    onSearch(ticker);
  };

  return (
    <form className="command-ticker-form" aria-label="Ticker search" onSubmit={submit}>
      <label htmlFor="command-ticker">Ticker symbol</label>
      <div className="command-ticker-row">
        <Search size={16} aria-hidden="true" />
        <input
          id="command-ticker"
          value={value}
          maxLength={10}
          autoComplete="off"
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          placeholder="NVDA"
        />
        <button className="btn-analyze" type="submit" disabled={loading}>
          {loading ? 'Loading...' : 'Load quote'}
        </button>
      </div>
      {error && (
        <div className="command-inline-error" role="alert">
          {error}
        </div>
      )}
    </form>
  );
}

TickerInput.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onSearch: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};
