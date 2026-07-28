import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Search, TrendingUp, TrendingDown, Zap, ChevronRight, X, Clock } from 'lucide-react';
import { useNavigate } from 'react-router';
import { usePreferences } from '../hooks/usePreferences';
import { cn } from '../lib/utils';

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
  const { preferences } = usePreferences();
  const theme = preferences?.theme || 'dark';
  const config = {
    autosize: true,
    symbol,
    interval: 'D',
    timezone: 'Asia/Bangkok',
    theme,
    style: '1',
    locale: 'en',
    allow_symbol_change: false,
    hide_side_toolbar: false,
    studies: ['MASimple@tv-basicstudies', 'RSI@tv-basicstudies'],
  };
  const src = `https://www.tradingview-widget.com/embed-widget/advanced-chart/?locale=en#${encodeURIComponent(JSON.stringify(config))}`;

  return (
    <div className="tradingview-widget-container h-full w-full">
      <iframe title={`${symbol} TradingView chart`} src={src} loading="lazy" allow="fullscreen" className="h-full w-full border-0" />
    </div>
  );
}

/* ─── Ticker Row ──────────────────────────────────────────── */
function TickerRow({ ticker, isActive, onSelect, onAnalyze }) {
  const symbol = displaySymbol(ticker.symbol);

  return (
    <div
      className={cn(
        'flex w-full items-center gap-2 rounded-sm border px-2 py-1.5 transition-colors',
        isActive ? 'border-brand bg-surface-hover' : 'border-transparent hover:border-border-subtle hover:bg-surface-hover'
      )}
      role="listitem"
    >
      <button
        className="flex min-w-0 flex-1 items-center gap-2 rounded-sm bg-transparent px-1 py-1 text-left text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        type="button"
        onClick={onSelect}
        aria-pressed={isActive}
      >
        <div
          className="grid size-8 shrink-0 place-items-center rounded-sm border border-border-subtle bg-panel-solid font-mono text-[0.6rem] font-bold text-text-secondary"
          data-market={ticker.market}
        >
          {symbol.slice(0, 3)}
        </div>
        <div className="min-w-0 flex-1">
          <span className="block truncate font-mono text-xs font-bold">{symbol}</span>
          <span className="block truncate text-xs text-text-secondary">{ticker.name}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-[0.7rem] text-text-secondary">
          <span>{ticker.market}</span>
          {isActive && <ChevronRight size={12} aria-hidden="true" />}
        </div>
      </button>
      <button
        className="grid size-9 shrink-0 place-items-center rounded-sm border border-border-subtle bg-panel-solid text-text-secondary hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        type="button"
        onClick={onAnalyze}
        aria-label={`Quick analyze ${symbol}`}
      >
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
    <div className="[display:grid] [grid-template-columns:340px_1fr] [flex:1_1_auto] [min-height:0] [overflow:hidden] max-[768px]:[grid-template-columns:minmax(0,_1fr)] max-[768px]:[height:auto] max-[768px]:[overflow:visible]">
      {/* ── Left Panel: Ticker List ── */}
      <aside className="[display:flex] [flex-direction:column] [border-radius:0] [border-top:none] [background:var(--bg-shell)] [backdrop-filter:none] [overflow:hidden] rounded-lg border border-border bg-panel shadow-none">
        <div className="[padding:16px_16px_12px] [border-bottom:1px_solid_var(--border-subtle)] [flex-shrink:0]">
          <div className="[font-size:0.75rem] [font-weight:600] [letter-spacing:0.08em] [text-transform:uppercase] [color:var(--text-secondary)] [margin-bottom:12px]">
            ค้นหาหุ้น
          </div>
          <div className="[position:relative] [display:flex] [align-items:center]">
            <Search
              size={14}
              className="[position:absolute] [left:10px] [color:var(--text-secondary)] [pointer-events:none] [flex-shrink:0]"
              aria-hidden="true"
            />
            <input
              ref={searchRef}
              id="ticker-search"
              className="min-h-10 w-full rounded-sm border border-border bg-panel-solid px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-text-muted focus:border-brand focus:ring-2 focus:ring-brand"
              type="search"
              placeholder="ค้นหาชื่อหุ้นหรือบริษัท..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search tickers"
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button
                className="[position:absolute] [right:36px] [background:none] [border:none] [color:var(--text-secondary)] [cursor:pointer] [padding:4px] [display:flex] [align-items:center] [border-radius:4px] [transition:color_0.15s] hover:[color:var(--text-primary)] max-[768px]:[min-width:44px] max-[768px]:[min-height:44px]"
                onClick={() => setQuery('')}
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
            <kbd
              className="pointer-events-none absolute right-2 rounded border border-border-subtle bg-surface-hover px-1.5 py-0.5 font-mono text-xs text-text-secondary"
              aria-hidden="true"
            >
              ⌘K
            </kbd>
          </div>
        </div>

        <section
          className="[flex-shrink:0] [padding:10px_12px] [border-bottom:1px_solid_var(--border-subtle)] [display:flex] [flex-direction:column] [gap:10px] [max-height:310px] [overflow-y:auto]"
          aria-label="Market overview"
        >
          <div className="flex flex-col gap-2 border-b border-border-subtle py-2">
            <div className="text-[0.68rem] font-bold uppercase tracking-wide text-text-secondary">Market indices</div>
            <div className="[display:grid] [gap:6px] [grid-template-columns:repeat(3,_minmax(0,_1fr))]">
              {MARKET_INDICES.map((index) => (
                <button
                  key={index.symbol}
                  type="button"
                  className="[border:1px_solid_var(--border-subtle)] [border-radius:var(--radius-xs)] [background:rgba(var(--text-inverse-rgb),_0.03)] [color:var(--text-secondary)] [cursor:pointer] [min-width:0] [padding:7px_8px] [display:flex] [align-items:center] [justify-content:space-between] [gap:6px] [font-size:0.72rem] [text-align:left] hover:[border-color:var(--border-medium)] hover:[background:var(--bg-panel-hover)] hover:[color:var(--text-primary)] [&_strong]:font-mono [&_strong]:[color:var(--text-primary)] [&_strong]:[font-size:0.7rem]"
                  onClick={() => handleSelectSymbol(index.symbol)}
                >
                  <span>{index.label}</span>
                  <strong>{index.symbol}</strong>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 border-b border-border-subtle py-2">
            <div className="text-[0.68rem] font-bold uppercase tracking-wide text-text-secondary">Sector overview</div>
            <div className="[display:grid] [gap:6px] [grid-template-columns:repeat(2,_minmax(0,_1fr))]">
              {sectorOverview.map((sector) => (
                <button
                  key={sector.sector}
                  type="button"
                  className="[border:1px_solid_var(--border-subtle)] [border-radius:var(--radius-xs)] [background:rgba(var(--text-inverse-rgb),_0.03)] [color:var(--text-secondary)] [cursor:pointer] [min-width:0] [padding:7px_8px] [display:flex] [align-items:center] [justify-content:space-between] [gap:6px] [font-size:0.72rem] [text-align:left] hover:[border-color:var(--border-medium)] hover:[background:var(--bg-panel-hover)] hover:[color:var(--text-primary)] [&_strong]:font-mono [&_strong]:[color:var(--text-primary)] [&_strong]:[font-size:0.7rem]"
                  onClick={() => setQuery(sector.sector)}
                >
                  <span>{sector.sector}</span>
                  <strong>{sector.count}</strong>
                </button>
              ))}
            </div>
            <div className="text-pretty text-[0.68rem] leading-relaxed text-fin-warning">
              Sector performance unavailable without verified current data
            </div>
          </div>

          <div className="flex flex-col gap-2 border-b border-border-subtle py-2">
            <div className="text-[0.68rem] font-bold uppercase tracking-wide text-text-secondary">Theme watchlists</div>
            <div className="[display:flex] [flex-direction:column] [gap:6px]">
              {THEME_GROUPS.map((group) => (
                <div
                  key={group.name}
                  className="[display:flex] [justify-content:space-between] [gap:8px] [align-items:center] [color:var(--text-secondary)] [font-size:0.72rem]"
                >
                  <span>{group.name}</span>
                  <div className="flex flex-wrap justify-end gap-1 [&_button]:cursor-pointer [&_button]:rounded-sm [&_button]:border [&_button]:border-border-subtle [&_button]:bg-surface [&_button]:px-1.5 [&_button]:py-1 [&_button]:font-mono [&_button]:text-xs [&_button]:text-text-secondary [&_button:hover]:border-border-medium [&_button:hover]:bg-surface-hover [&_button:hover]:text-foreground">
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

        <div
          className="[flex:1] [overflow-y:auto] [padding:6px_8px] [scrollbar-width:thin] [scrollbar-color:rgba(var(--text-inverse-rgb),_0.08)_transparent] [&::-webkit-scrollbar]:[width:4px] [&::-webkit-scrollbar-track]:[background:transparent] [&::-webkit-scrollbar-thumb]:[background:rgba(var(--text-inverse-rgb),_0.08)] [&::-webkit-scrollbar-thumb]:[border-radius:2px] max-[768px]:[flex:none] max-[768px]:[max-height:360px]"
          role="list"
          aria-label="Ticker list"
        >
          {filtered.length === 0 ? (
            <div className="[display:flex] [flex-direction:column] [align-items:center] [justify-content:center] [padding:40px_16px] [color:var(--text-secondary)] [font-size:0.8rem] [text-align:center]">
              <Search size={20} className="mb-2 opacity-30" />
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

        <div className="[padding:10px_16px] [border-top:1px_solid_var(--border-subtle)] [font-size:0.7rem] [color:var(--text-secondary)] [flex-shrink:0]">
          <span>
            {TICKERS.length} รายการ · แสดง {filtered.length} รายการ
          </span>
        </div>
      </aside>

      {/* ── Right Panel: Chart ── */}
      <section className="[display:flex] [flex-direction:column] [overflow:hidden] max-[768px]:[min-height:620px]" aria-label="Price chart">
        {/* Chart Header */}
        <div className="[display:flex] [align-items:center] [justify-content:space-between] [padding:12px_20px] [border-radius:0] [border-top:none] [border-left:none] [border-right:none] [border-bottom:1px_solid_var(--border-subtle)] [background:var(--bg-panel)] [flex-shrink:0] [gap:16px] max-[768px]:[align-items:stretch] max-[768px]:[flex-direction:column] rounded-lg border border-border bg-panel shadow-none">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <div className="font-mono text-lg font-bold text-foreground">{selectedSymbol}</div>
            <div className="min-w-0 truncate text-sm text-text-secondary">{selected.name}</div>
            <span
              className="rounded-full border border-border-subtle bg-surface-hover px-2 py-0.5 text-xs font-bold uppercase text-text-secondary"
              data-market={selected.market}
            >
              {selected.market}
            </span>
            <span className="text-xs text-text-secondary">{selected.sector}</span>
            <span className="ml-2 flex items-center gap-1 font-mono text-xs text-text-secondary">
              <Clock size={10} aria-hidden="true" />
              <span>Display quote only, not execution gate</span>
            </span>
            <span className="[font-size:0.7rem] [color:var(--fin-warning)] [white-space:nowrap] max-[768px]:[white-space:normal]">
              Execution price requires Command Center quote gate
            </span>
          </div>
          <div className="flex items-center gap-3 max-[768px]:w-full max-[768px]:justify-between">
            {priceLoading && (
              <div className="[display:flex] [flex-direction:column] [gap:4px]">
                <div className="h-3 w-20 animate-pulse rounded bg-surface-hover" />
                <div className="h-3 w-12 animate-pulse rounded bg-surface-hover" />
              </div>
            )}
            {!priceLoading && !priceData && !selected.symbol.includes('USD') && (
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-border-subtle bg-transparent px-3 py-1.5 font-sans text-sm font-semibold text-text-secondary transition-colors hover:border-border-hover hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:text-text-muted"
                onClick={() => fetchPrice(selected.symbol)}
              >
                Retry quote
              </button>
            )}
            {!priceLoading && priceData && (
              <div className="[display:flex] [align-items:baseline] [gap:8px]">
                <span
                  key={`${selected.symbol}-${priceData.price}`}
                  className={cn(
                    'flex items-baseline gap-2 rounded-sm',
                    priceData.change >= 0 ? 'animate-[data-update-flash-up_0.6s_ease-out]' : 'animate-[data-update-flash-down_0.6s_ease-out]'
                  )}
                >
                  ฿
                  {priceData.price?.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }) ?? '—'}
                </span>
                {priceData.change != null && (
                  <span className={cn('flex items-baseline gap-2 font-mono text-xs', priceData.change >= 0 ? 'text-fin-profit' : 'text-fin-loss')}>
                    {priceData.change >= 0 ? <TrendingUp size={13} aria-hidden="true" /> : <TrendingDown size={13} aria-hidden="true" />}
                    {priceData.change >= 0 ? '+' : ''}
                    {priceData.changePct?.toFixed(2)}%
                  </span>
                )}
              </div>
            )}
            <button
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border border-border-subtle bg-transparent px-5 py-2.5 font-sans text-sm font-semibold text-text-secondary transition-colors hover:border-border-hover hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:text-text-muted"
              onClick={handleOpenDetail}
              aria-label={`Open ${selectedSymbol} detail`}
            >
              Open detail
            </button>
            <button
              id="send-to-ai-btn"
              className="[&:active:not(:disabled)]:[transform:scale(0.98)_translateY(1px)] [display:flex] [align-items:center] [gap:6px] [padding:7px_14px] [background:var(--brand-primary)] [border:none] [border-radius:var(--radius-xs)] [color:var(--text-inverse)] [font-size:0.78rem] [font-weight:600] font-sans [cursor:pointer] [transition:transform_0.15s] [white-space:nowrap] hover:[transform:translateY(-1px)] active:[transform:translateY(0)]"
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
        <div className="[flex:1] [overflow:hidden] [min-height:0] max-[768px]:[min-height:460px]">
          <TradingViewChart symbol={selected.symbol} />
        </div>
      </section>
    </div>
  );
}
