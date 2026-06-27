import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Search, TrendingUp, TrendingDown, Zap, ChevronRight, X, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/* ─── Default ticker universe ─────────────────────────────── */
const TICKERS = [
  // US Mega-cap
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    market: 'NASDAQ',
    sector: 'Technology',
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corp.',
    market: 'NASDAQ',
    sector: 'Technology',
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corp.',
    market: 'NASDAQ',
    sector: 'Technology',
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    market: 'NASDAQ',
    sector: 'Technology',
  },
  {
    symbol: 'AMZN',
    name: 'Amazon.com Inc.',
    market: 'NASDAQ',
    sector: 'Consumer',
  },
  {
    symbol: 'META',
    name: 'Meta Platforms Inc.',
    market: 'NASDAQ',
    sector: 'Technology',
  },
  {
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    market: 'NASDAQ',
    sector: 'Automotive',
  },
  {
    symbol: 'AVGO',
    name: 'Broadcom Inc.',
    market: 'NASDAQ',
    sector: 'Semiconductors',
  },
  {
    symbol: 'TSM',
    name: 'Taiwan Semiconductor',
    market: 'NYSE',
    sector: 'Semiconductors',
  },
  {
    symbol: 'AMD',
    name: 'Advanced Micro Devices',
    market: 'NASDAQ',
    sector: 'Semiconductors',
  },
  {
    symbol: 'INTC',
    name: 'Intel Corp.',
    market: 'NASDAQ',
    sector: 'Semiconductors',
  },
  {
    symbol: 'ORCL',
    name: 'Oracle Corp.',
    market: 'NYSE',
    sector: 'Technology',
  },
  {
    symbol: 'CRM',
    name: 'Salesforce Inc.',
    market: 'NYSE',
    sector: 'Technology',
  },
  { symbol: 'NFLX', name: 'Netflix Inc.', market: 'NASDAQ', sector: 'Media' },
  {
    symbol: 'ADBE',
    name: 'Adobe Inc.',
    market: 'NASDAQ',
    sector: 'Technology',
  },
  // ETF / Indices
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', market: 'NYSE', sector: 'ETF' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', market: 'NASDAQ', sector: 'ETF' },
  {
    symbol: 'SOXX',
    name: 'iShares Semiconductor ETF',
    market: 'NASDAQ',
    sector: 'ETF',
  },
  // Space / orbital compute theme
  { symbol: 'ASTS', name: 'AST SpaceMobile', market: 'NASDAQ', sector: 'Space Data Center' },
  { symbol: 'RKLB', name: 'Rocket Lab USA', market: 'NASDAQ', sector: 'Space Data Center' },
  { symbol: 'LUNR', name: 'Intuitive Machines', market: 'NASDAQ', sector: 'Space Data Center' },
  // Finance
  {
    symbol: 'JPM',
    name: 'JPMorgan Chase & Co.',
    market: 'NYSE',
    sector: 'Finance',
  },
  {
    symbol: 'GS',
    name: 'Goldman Sachs Group',
    market: 'NYSE',
    sector: 'Finance',
  },
  {
    symbol: 'BRK-B',
    name: 'Berkshire Hathaway B',
    market: 'NYSE',
    sector: 'Finance',
  },
  // Energy & Macro
  {
    symbol: 'XOM',
    name: 'Exxon Mobil Corp.',
    market: 'NYSE',
    sector: 'Energy',
  },
  {
    symbol: 'GLD',
    name: 'SPDR Gold Shares ETF',
    market: 'NYSE',
    sector: 'Commodity',
  },
  {
    symbol: 'BTC-USD',
    name: 'Bitcoin USD',
    market: 'CRYPTO',
    sector: 'Crypto',
  },
  {
    symbol: 'ETH-USD',
    name: 'Ethereum USD',
    market: 'CRYPTO',
    sector: 'Crypto',
  },
  // Thai SET
  {
    symbol: 'SET:PTT',
    name: 'PTT Public Co.',
    market: 'SET',
    sector: 'Energy',
  },
  {
    symbol: 'SET:AOT',
    name: 'Airports of Thailand',
    market: 'SET',
    sector: 'Transport',
  },
  {
    symbol: 'SET:CPALL',
    name: 'CP All PCL',
    market: 'SET',
    sector: 'Consumer',
  },
  {
    symbol: 'SET:SCB',
    name: 'Siam Commercial Bank',
    market: 'SET',
    sector: 'Finance',
  },
  {
    symbol: 'SET:KBANK',
    name: 'Kasikornbank PCL',
    market: 'SET',
    sector: 'Finance',
  },
];

const MARKET_INDICES = [
  { label: 'S&P 500', symbol: 'SPY' },
  { label: 'NASDAQ', symbol: 'QQQ' },
  { label: 'DJI', symbol: 'DIA' },
];

const THEME_GROUPS = [
  { name: 'AI Infrastructure', symbols: ['NVDA', 'AVGO', 'TSM', 'AMD', 'ORCL'] },
  { name: 'Space Data Center', symbols: ['ASTS', 'RKLB', 'LUNR'] },
  { name: 'Macro Hedges', symbols: ['SPY', 'QQQ', 'SOXX', 'GLD'] },
];

function displaySymbol(symbol) {
  return symbol.replace('SET:', '');
}

function findTicker(symbol) {
  return TICKERS.find((ticker) => ticker.symbol === symbol || displaySymbol(ticker.symbol) === symbol);
}

function buildSectorOverview(tickers) {
  const sectors = new Map();
  for (const ticker of tickers) {
    const current = sectors.get(ticker.sector) || { sector: ticker.sector, count: 0 };
    current.count += 1;
    sectors.set(ticker.sector, current);
  }
  return Array.from(sectors.values())
    .sort((a, b) => b.count - a.count || a.sector.localeCompare(b.sector))
    .slice(0, 8);
}

function normalizeDisplayQuote(payload) {
  const price = Number(payload?.price);
  if (!Number.isFinite(price) || price <= 0) return null;

  const change = Number(payload?.change);
  const changePct = Number(payload?.changePct);
  return {
    ...payload,
    price,
    change: Number.isFinite(change) ? change : null,
    changePct: Number.isFinite(changePct) ? changePct : null,
  };
}

/* ─── TradingView Widget ──────────────────────────────────── */
function TradingViewChart({ symbol }) {
  const config = {
    autosize: true,
    symbol,
    interval: 'D',
    timezone: 'Asia/Bangkok',
    theme: 'dark',
    style: '1',
    locale: 'en',
    allow_symbol_change: false,
    hide_side_toolbar: false,
    studies: ['MASimple@tv-basicstudies', 'RSI@tv-basicstudies'],
  };
  const src = `https://www.tradingview-widget.com/embed-widget/advanced-chart/?locale=en#${encodeURIComponent(JSON.stringify(config))}`;

  return (
    <div className="tradingview-widget-container" style={{ height: '100%', width: '100%' }}>
      <iframe
        title={`${symbol} TradingView chart`}
        src={src}
        loading="lazy"
        allow="fullscreen"
        style={{ width: '100%', height: '100%', border: 0 }}
      />
    </div>
  );
}

/* ─── Ticker Row ──────────────────────────────────────────── */
function TickerRow({ ticker, isActive, onSelect, onAnalyze }) {
  const symbol = displaySymbol(ticker.symbol);

  return (
    <div className={`ticker-row${isActive ? ' ticker-row--active' : ''}`} role="option" aria-selected={isActive}>
      <button className="ticker-row__select" type="button" onClick={onSelect} aria-pressed={isActive}>
        <div className="ticker-row__icon" data-market={ticker.market}>
          {symbol.slice(0, 3)}
        </div>
        <div className="ticker-row__info">
          <span className="ticker-row__symbol">{symbol}</span>
          <span className="ticker-row__name">{ticker.name}</span>
        </div>
        <div className="ticker-row__meta">
          <span className="ticker-row__market">{ticker.market}</span>
          {isActive && <ChevronRight size={12} className="ticker-row__arrow" />}
        </div>
      </button>
      <button className="ticker-row__quick-analyze" type="button" onClick={onAnalyze} aria-label={`Quick analyze ${symbol}`}>
        <Zap size={12} aria-hidden="true" />
      </button>
    </div>
  );
}

/* ─── Market Explorer Page ────────────────────────────────── */
TradingViewChart.propTypes = {
  symbol: PropTypes.string.isRequired,
};

TickerRow.propTypes = {
  ticker: PropTypes.shape({
    symbol: PropTypes.string.isRequired,
    name: PropTypes.string,
    market: PropTypes.string,
  }).isRequired,
  isActive: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
  onAnalyze: PropTypes.func.isRequired,
};

export default function MarketExplorerPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(TICKERS[0]);
  const [priceData, setPriceData] = useState(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const searchRef = useRef(null);
  const sectorOverview = useMemo(() => buildSectorOverview(TICKERS), []);

  const filtered = query.trim()
    ? TICKERS.filter(
        (t) =>
          t.symbol.toLowerCase().includes(query.toLowerCase()) ||
          t.name.toLowerCase().includes(query.toLowerCase()) ||
          t.sector.toLowerCase().includes(query.toLowerCase())
      )
    : TICKERS;

  const selectedSymbol = displaySymbol(selected.symbol);

  // Fetch live price for the selected ticker
  const fetchPrice = useCallback(async (symbol) => {
    // Skip for SET and crypto which Yahoo Finance may not support well via our proxy
    const ySymbol = symbol.replace('SET:', '') + (symbol.startsWith('SET:') ? '.BK' : '');
    if (symbol.includes('USD')) {
      setPriceData(null);
      return;
    }
    setPriceLoading(true);
    try {
      const res = await fetch(`/api/price/${encodeURIComponent(ySymbol)}`);
      if (res.ok) {
        const data = await res.json();
        setPriceData(normalizeDisplayQuote(data));
      } else {
        setPriceData(null);
      }
    } catch {
      setPriceData(null);
    } finally {
      setPriceLoading(false);
    }
  }, []);

  useEffect(() => {
    // Selected-ticker changes intentionally start the quote loading lifecycle.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPrice(selected.symbol);
  }, [selected, fetchPrice]);

  // Keyboard shortcut: Cmd/Ctrl+K to focus search
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    globalThis.addEventListener('keydown', handler);
    return () => globalThis.removeEventListener('keydown', handler);
  }, []);

  const handleOpenDetail = () => {
    navigate(`/ticker/${selectedSymbol}`);
  };

  const handleQuickAnalyze = useCallback(
    (symbol) => {
      navigate(`/command-center?ticker=${encodeURIComponent(displaySymbol(symbol))}`);
    },
    [navigate]
  );

  const handleSelectSymbol = (symbol) => {
    const ticker = findTicker(symbol);
    if (ticker) setSelected(ticker);
  };

  return (
    <div className="market-explorer">
      {/* ── Left Panel: Ticker List ── */}
      <aside className="explorer-sidebar glass-panel">
        <div className="sidebar-header">
          <div className="sidebar-title">ค้นหาหุ้น</div>
          <div className="search-wrap">
            <Search size={14} className="search-icon" aria-hidden="true" />
            <input
              ref={searchRef}
              id="ticker-search"
              className="search-input"
              type="search"
              placeholder="ค้นหาชื่อหุ้นหรือบริษัท..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search tickers"
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button className="search-clear" onClick={() => setQuery('')} aria-label="Clear search">
                <X size={12} />
              </button>
            )}
            <kbd className="search-kbd" aria-hidden="true">
              ⌘K
            </kbd>
          </div>
        </div>

        <section className="market-overview" aria-label="Market overview">
          <div className="market-overview__section">
            <div className="market-overview__title">Market indices</div>
            <div className="market-index-grid">
              {MARKET_INDICES.map((index) => (
                <button key={index.symbol} type="button" className="market-index-pill" onClick={() => handleSelectSymbol(index.symbol)}>
                  <span>{index.label}</span>
                  <strong>{index.symbol}</strong>
                </button>
              ))}
            </div>
          </div>

          <div className="market-overview__section">
            <div className="market-overview__title">Sector overview</div>
            <div className="market-sector-grid">
              {sectorOverview.map((sector) => (
                <button key={sector.sector} type="button" className="market-sector-cell" onClick={() => setQuery(sector.sector)}>
                  <span>{sector.sector}</span>
                  <strong>{sector.count}</strong>
                </button>
              ))}
            </div>
            <div className="market-overview__note">Sector performance unavailable without verified current data</div>
          </div>

          <div className="market-overview__section">
            <div className="market-overview__title">Theme watchlists</div>
            <div className="theme-watchlist-groups">
              {THEME_GROUPS.map((group) => (
                <div key={group.name} className="theme-watchlist-group">
                  <span>{group.name}</span>
                  <div className="theme-symbols">
                    {group.symbols.map((symbol) => (
                      <button key={symbol} type="button" onClick={() => handleQuickAnalyze(symbol)} aria-label={`Quick analyze ${symbol}`}>
                        {symbol}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="ticker-list" role="listbox" aria-label="Ticker list">
          {filtered.length === 0 ? (
            <div className="ticker-empty">
              <Search size={20} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p>ไม่พบผลลัพธ์สำหรับ "{query}"</p>
            </div>
          ) : (
            filtered.map((ticker) => (
              <TickerRow
                key={ticker.symbol}
                ticker={ticker}
                isActive={selected.symbol === ticker.symbol}
                onSelect={() => setSelected(ticker)}
                onAnalyze={() => handleQuickAnalyze(ticker.symbol)}
              />
            ))
          )}
        </div>

        <div className="sidebar-footer">
          <span>
            {TICKERS.length} รายการ · แสดง {filtered.length} รายการ
          </span>
        </div>
      </aside>

      {/* ── Right Panel: Chart ── */}
      <section className="explorer-chart-panel" aria-label="Price chart">
        {/* Chart Header */}
        <div className="chart-header glass-panel">
          <div className="chart-header__left">
            <div className="chart-header__symbol">{selectedSymbol}</div>
            <div className="chart-header__name">{selected.name}</div>
            <span className="chart-header__badge" data-market={selected.market}>
              {selected.market}
            </span>
            <span className="chart-header__sector">{selected.sector}</span>
            <span className="data-stamp" style={{ marginLeft: 8 }}>
              <Clock size={10} aria-hidden="true" />
              Display quote only, not execution gate
            </span>
            <span className="quote-gate-note">Execution price requires Command Center quote gate</span>
          </div>
          <div className="chart-header__right">
            {priceLoading && (
              <div className="price-skeleton">
                <div className="skeleton-bar" style={{ width: 80 }} />
                <div className="skeleton-bar" style={{ width: 50 }} />
              </div>
            )}
            {!priceLoading && !priceData && !selected.symbol.includes('USD') && (
              <button className="btn-secondary" style={{ padding: '6px 12px', marginTop: 0 }} onClick={() => fetchPrice(selected.symbol)}>
                Retry quote
              </button>
            )}
            {!priceLoading && priceData && (
              <div className="live-price">
                <span
                  key={`${selected.symbol}-${priceData.price}`}
                  className={`live-price__value data-update-flash ${priceData.change >= 0 ? 'data-update-flash--up' : 'data-update-flash--down'}`}
                >
                  ฿
                  {priceData.price?.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }) ?? '—'}
                </span>
                {priceData.change != null && (
                  <span className={`live-price__change ${priceData.change >= 0 ? 'up' : 'down'}`}>
                    {priceData.change >= 0 ? <TrendingUp size={13} aria-hidden="true" /> : <TrendingDown size={13} aria-hidden="true" />}
                    {priceData.change >= 0 ? '+' : ''}
                    {priceData.changePct?.toFixed(2)}%
                  </span>
                )}
              </div>
            )}
            <button className="btn-secondary market-detail-btn" onClick={handleOpenDetail} aria-label={`Open ${selectedSymbol} detail`}>
              Open detail
            </button>
            <button
              id="send-to-ai-btn"
              className="btn-send-ai"
              onClick={() => handleQuickAnalyze(selected.symbol)}
              title={`ส่ง ${selectedSymbol} ไปให้ AI วิเคราะห์`}
              aria-label={`Quick analyze ${selectedSymbol}`}
            >
              <Zap size={14} fill="currentColor" strokeWidth={0} aria-hidden="true" />
              Quick analyze
            </button>
          </div>
        </div>

        {/* TradingView Chart */}
        <div className="chart-canvas">
          <TradingViewChart symbol={selected.symbol} />
        </div>
      </section>
    </div>
  );
}
