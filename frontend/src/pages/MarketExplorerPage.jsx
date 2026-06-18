import React, { useState, useEffect, useRef, useCallback } from 'react';
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

/* ─── TradingView Widget ──────────────────────────────────── */
function TradingViewChart({ symbol }) {
  const containerRef = useRef(null);
  const prevSymbolRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (prevSymbolRef.current === symbol) return;
    prevSymbolRef.current = symbol;

    // Clear previous widget
    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbol,
      interval: 'D',
      timezone: 'Asia/Bangkok',
      theme: 'dark',
      style: '1',
      locale: 'en',
      allow_symbol_change: false,
      calendar: false,
      support_host: 'https://www.tradingview.com',
      backgroundColor: 'rgba(var(--bg-slate-rgb), 1)',
      gridColor: 'rgba(var(--text-inverse-rgb), 0.04)',
      watchlist: [],
      hide_side_toolbar: false,
      studies: ['MASimple@tv-basicstudies', 'RSI@tv-basicstudies'],
      show_popup_button: true,
      popup_width: '1000',
      popup_height: '650',
    });

    containerRef.current.appendChild(script);
  }, [symbol]);

  return (
    <div className="tradingview-widget-container" ref={containerRef} style={{ height: '100%', width: '100%' }}>
      <div className="tradingview-widget-container__widget" style={{ height: '100%', width: '100%' }} />
    </div>
  );
}

/* ─── Ticker Row ──────────────────────────────────────────── */
function TickerRow({ ticker, isActive, onClick }) {
  return (
    <button className={`ticker-row${isActive ? ' ticker-row--active' : ''}`} onClick={onClick} aria-pressed={isActive}>
      <div className="ticker-row__icon" data-market={ticker.market}>
        {ticker.symbol.replace('SET:', '').slice(0, 3)}
      </div>
      <div className="ticker-row__info">
        <span className="ticker-row__symbol">{ticker.symbol.replace('SET:', '')}</span>
        <span className="ticker-row__name">{ticker.name}</span>
      </div>
      <div className="ticker-row__meta">
        <span className="ticker-row__market">{ticker.market}</span>
        {isActive && <ChevronRight size={12} className="ticker-row__arrow" />}
      </div>
    </button>
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
  onClick: PropTypes.func.isRequired,
};

export default function MarketExplorerPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(TICKERS[0]);
  const [priceData, setPriceData] = useState(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const searchRef = useRef(null);

  const filtered = query.trim()
    ? TICKERS.filter(
        (t) =>
          t.symbol.toLowerCase().includes(query.toLowerCase()) ||
          t.name.toLowerCase().includes(query.toLowerCase()) ||
          t.sector.toLowerCase().includes(query.toLowerCase())
      )
    : TICKERS;

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
        setPriceData(data);
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

  const handleSendToAI = () => {
    navigate('/', { state: { ticker: selected.symbol.replace('SET:', '') } });
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

        <div className="ticker-list" role="listbox" aria-label="Ticker list">
          {filtered.length === 0 ? (
            <div className="ticker-empty">
              <Search size={20} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p>ไม่พบผลลัพธ์สำหรับ "{query}"</p>
            </div>
          ) : (
            filtered.map((ticker) => (
              <TickerRow key={ticker.symbol} ticker={ticker} isActive={selected.symbol === ticker.symbol} onClick={() => setSelected(ticker)} />
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
      <main className="explorer-chart-panel" aria-label="Price chart">
        {/* Chart Header */}
        <div className="chart-header glass-panel">
          <div className="chart-header__left">
            <div className="chart-header__symbol">{selected.symbol.replace('SET:', '')}</div>
            <div className="chart-header__name">{selected.name}</div>
            <span className="chart-header__badge" data-market={selected.market}>
              {selected.market}
            </span>
            <span className="chart-header__sector">{selected.sector}</span>
            <span className="data-stamp" style={{ marginLeft: 8 }}>
              <Clock size={10} aria-hidden="true" />
              Display quote only, not execution gate
            </span>
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
                <span className="live-price__value">
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
            <button
              id="send-to-ai-btn"
              className="btn-send-ai"
              onClick={handleSendToAI}
              title={`ส่ง ${selected.symbol.replace('SET:', '')} ไปให้ AI วิเคราะห์`}
            >
              <Zap size={14} fill="currentColor" strokeWidth={0} aria-hidden="true" />
              ส่งไปวิเคราะห์
            </button>
          </div>
        </div>

        {/* TradingView Chart */}
        <div className="chart-canvas">
          <TradingViewChart symbol={selected.symbol} />
        </div>
      </main>
    </div>
  );
}
