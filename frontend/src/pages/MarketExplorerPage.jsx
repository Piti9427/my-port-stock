import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Search, TrendingUp, TrendingDown, Zap, X, Clock } from 'lucide-react';
import { useNavigate } from 'react-router';
import { usePreferences } from '../hooks/usePreferences';
import { cn } from '@/lib/utils';

const TICKERS = [
  { symbol: 'AAPL', name: 'Apple Inc.', market: 'NASDAQ', sector: 'Technology' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', market: 'NASDAQ', sector: 'Technology' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', market: 'NASDAQ', sector: 'Technology' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', market: 'NASDAQ', sector: 'Technology' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', market: 'NASDAQ', sector: 'Consumer' },
  { symbol: 'META', name: 'Meta Platforms Inc.', market: 'NASDAQ', sector: 'Technology' },
  { symbol: 'TSLA', name: 'Tesla Inc.', market: 'NASDAQ', sector: 'Automotive' },
  { symbol: 'AVGO', name: 'Broadcom Inc.', market: 'NASDAQ', sector: 'Semiconductors' },
  { symbol: 'TSM', name: 'Taiwan Semiconductor', market: 'NYSE', sector: 'Semiconductors' },
  { symbol: 'ORCL', name: 'Oracle Corp.', market: 'NYSE', sector: 'Software' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', market: 'NASDAQ', sector: 'Semiconductors' },
  { symbol: 'QCOM', name: 'QUALCOMM Inc.', market: 'NASDAQ', sector: 'Semiconductors' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', market: 'NYSE', sector: 'ETF' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', market: 'NASDAQ', sector: 'ETF' },
  { symbol: 'SET:DELTA', name: 'Delta Electronics TH', market: 'SET', sector: 'Electronics' },
  { symbol: 'SET:ADVANC', name: 'Advanced Info Service', market: 'SET', sector: 'Telecom' },
  { symbol: 'SET:PTT', name: 'PTT Public Co.', market: 'SET', sector: 'Energy' },
  { symbol: 'SET:AOT', name: 'Airports of Thailand', market: 'SET', sector: 'Transport' },
  { symbol: 'SET:CPALL', name: 'CP ALL Public Co.', market: 'SET', sector: 'Commerce' },
  { symbol: 'SET:BDMS', name: 'Bangkok Dusit Med', market: 'SET', sector: 'Healthcare' },
  { symbol: 'SET:KBANK', name: 'Kasikornbank', market: 'SET', sector: 'Banking' },
  { symbol: 'SET:SCB', name: 'SCB X Public Co.', market: 'SET', sector: 'Banking' },
  { symbol: 'BTCUSD', name: 'Bitcoin / US Dollar', market: 'CRYPTO', sector: 'Digital Assets' },
  { symbol: 'ETHUSD', name: 'Ethereum / US Dollar', market: 'CRYPTO', sector: 'Digital Assets' },
];

const MARKET_INDICES = [
  { label: 'S&P 500', symbol: 'SPY' },
  { label: 'NASDAQ', symbol: 'QQQ' },
  { label: 'DJI', symbol: 'DIA' },
];

const THEME_GROUPS = [
  { name: 'AI Infrastructure', symbols: ['NVDA', 'AAPL', 'MSFT', 'GOOGL'] },
  { name: 'Space Data Center', symbols: ['SET:DELTA', 'SET:ADVANC', 'SET:PTT', 'SET:AOT'] },
];

function displaySymbol(raw) {
  return raw.replace('SET:', '');
}

function findTicker(rawSymbol) {
  const norm = rawSymbol.toUpperCase();
  return TICKERS.find((t) => t.symbol.toUpperCase() === norm) || TICKERS.find((t) => displaySymbol(t.symbol).toUpperCase() === norm) || null;
}

function buildSectorOverview(tickers) {
  const counts = {};
  for (const t of tickers) {
    counts[t.sector] = (counts[t.sector] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([sector, count]) => ({ sector, count }))
    .sort((a, b) => b.count - a.count);
}

function normalizeDisplayQuote(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const rawPrice = payload.last_price ?? payload.price ?? payload.regularMarketPrice;
  const rawChange = payload.change ?? payload.regularMarketChange;
  const rawPct = payload.change_percent ?? payload.change_pct ?? payload.regularMarketChangePercent;

  const price = Number(rawPrice);
  if (!Number.isFinite(price)) return null;

  return {
    price,
    change: Number.isFinite(Number(rawChange)) ? Number(rawChange) : null,
    changePct: Number.isFinite(Number(rawPct)) ? Number(rawPct) : null,
  };
}

function TradingViewChart({ symbol }) {
  const { preferences } = usePreferences();
  const theme = preferences.theme === 'light' ? 'light' : 'dark';
  const displaySym = displaySymbol(symbol);

  const tvSymbol = symbol.startsWith('SET:') ? `SET:${symbol.replace('SET:', '')}` : symbol.includes('USD') ? `BINANCE:${symbol}` : symbol;

  const widgetConfig = encodeURIComponent(
    JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: 'D',
      timezone: 'Asia/Bangkok',
      theme,
      style: '1',
      locale: 'th_TH',
      allow_symbol_change: true,
      calendar: false,
      support_host: 'https://www.tradingview.com',
    })
  );

  return (
    <div className="w-full h-full min-h-[420px]">
      <iframe
        title={`${displaySym} TradingView chart`}
        loading="lazy"
        src={`https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.html#${widgetConfig}`}
        className="w-full h-full min-h-[420px] border-0"
      />
    </div>
  );
}

function TickerRow({ ticker, isActive, onSelect, onAnalyze }) {
  const symbol = displaySymbol(ticker.symbol);

  return (
    <div
      role="option"
      aria-selected={isActive}
      aria-label={`${symbol} ${ticker.name}`}
      className={cn(
        'flex items-center gap-2 p-2 rounded-lg border border-transparent transition-all',
        isActive ? 'bg-emerald-500/10 border-emerald-500/30' : 'hover:bg-neutral-900/60'
      )}
    >
      <button className="flex-1 flex items-center gap-3 text-left bg-transparent border-0 cursor-pointer p-0" type="button" onClick={onSelect}>
        <div className="w-9 h-9 rounded-md bg-neutral-900 border border-neutral-800 flex items-center justify-center font-mono font-bold text-xs text-emerald-400">
          {symbol.slice(0, 3)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-neutral-100 flex items-center gap-1.5">
            {symbol}
            <span className="text-[0.65rem] px-1 py-0.2 bg-neutral-800 text-neutral-400 rounded font-normal">{ticker.market}</span>
          </div>
          <div className="text-[0.72rem] text-neutral-400 truncate">{ticker.name}</div>
        </div>
      </button>
      <button
        className="p-1.5 text-neutral-400 hover:text-amber-400 hover:bg-amber-400/10 rounded transition-colors"
        type="button"
        onClick={onAnalyze}
        aria-label={`Quick analyze ${symbol}`}
      >
        <Zap size={12} aria-hidden="true" />
      </button>
    </div>
  );
}

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

  const fetchPrice = useCallback(async (symbol) => {
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
    fetchPrice(selected.symbol);
  }, [selected, fetchPrice]);

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
    <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[340px_1fr] bg-neutral-950 text-neutral-100">
      <aside className="p-4 border-b lg:border-b-0 lg:border-r border-neutral-800 bg-neutral-900/40 flex flex-col gap-4 max-h-screen overflow-y-auto">
        <div className="flex flex-col gap-2">
          <div className="text-xs font-bold uppercase tracking-wider text-neutral-400">ค้นหาหุ้น</div>
          <div className="relative flex items-center">
            <Search size={14} className="absolute left-3 text-neutral-500" aria-hidden="true" />
            <input
              ref={searchRef}
              id="ticker-search"
              className="w-full pl-9 pr-14 py-1.5 text-xs bg-neutral-900 border border-neutral-800 rounded-md text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-700"
              type="search"
              placeholder="ค้นหาชื่อหุ้นหรือบริษัท..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search tickers"
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button className="absolute right-8 text-neutral-400 hover:text-neutral-200" onClick={() => setQuery('')} aria-label="Clear search">
                <X size={12} />
              </button>
            )}
            <kbd className="absolute right-2 px-1 py-0.5 text-[0.65rem] font-mono text-neutral-500 bg-neutral-800 rounded">⌘K</kbd>
          </div>
        </div>

        <section className="flex flex-col gap-4 text-xs" aria-label="Market overview" tabIndex={0}>
          <div>
            <div className="text-[0.7rem] font-semibold text-neutral-400 uppercase tracking-wider mb-2">Market overview</div>
            <div className="grid grid-cols-3 gap-1.5">
              {MARKET_INDICES.map((index) => (
                <button
                  key={index.symbol}
                  type="button"
                  className="p-2 text-left bg-neutral-900/60 border border-neutral-800/80 rounded-md hover:bg-neutral-800/60 transition-colors"
                  onClick={() => handleSelectSymbol(index.symbol)}
                >
                  <span className="block text-[0.65rem] text-neutral-400">{index.label}</span>
                  <strong className="block font-mono text-neutral-200">{index.symbol}</strong>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[0.7rem] font-semibold text-neutral-400 uppercase tracking-wider mb-2">Sector overview</div>
            <div className="grid grid-cols-2 gap-1.5">
              {sectorOverview.map((sector) => (
                <button
                  key={sector.sector}
                  type="button"
                  className="p-2 text-left bg-neutral-900/60 border border-neutral-800/80 rounded-md hover:bg-neutral-800/60 transition-colors"
                  onClick={() => setQuery(sector.sector)}
                >
                  <span className="block text-[0.65rem] text-neutral-400">{sector.sector}</span>
                  <strong className="block font-mono text-neutral-200">{sector.count}</strong>
                </button>
              ))}
            </div>
            <div className="text-[0.65rem] text-neutral-500 mt-1">Sector performance unavailable without verified current data</div>
          </div>

          <div>
            <div className="text-[0.7rem] font-semibold text-neutral-400 uppercase tracking-wider mb-2">Theme watchlists</div>
            <div className="flex flex-col gap-2">
              {THEME_GROUPS.map((group) => (
                <div key={group.name} className="flex flex-col gap-1">
                  <span className="text-[0.65rem] text-neutral-400 font-semibold">{group.name}</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {group.symbols.map((symbol) => (
                      <button
                        key={symbol}
                        type="button"
                        className="px-2 py-0.5 bg-neutral-800 text-neutral-200 rounded font-mono text-[0.65rem] hover:bg-neutral-700"
                        onClick={() => handleQuickAnalyze(symbol)}
                        aria-label={`Quick analyze ${symbol}`}
                      >
                        {displaySymbol(symbol)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="flex-1 min-h-[240px] flex flex-col gap-1 overflow-y-auto" role="listbox" aria-label="Ticker list" tabIndex={0}>
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-500">
              <Search size={20} className="mx-auto mb-2 opacity-40" />
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
      </aside>

      <section className="p-6 flex flex-col gap-4 overflow-hidden">
        <div className="p-4 border border-neutral-800 rounded-xl bg-neutral-900/60 backdrop-blur-sm flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-xl font-bold text-neutral-100">{selectedSymbol}</div>
            <div className="text-sm text-neutral-400">{selected.name}</div>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-neutral-800 text-neutral-300">{selected.market}</span>
            <span className="text-xs text-neutral-500">{selected.sector}</span>
            <span className="inline-flex items-center gap-1 text-[0.7rem] font-mono text-neutral-400">
              <Clock size={10} aria-hidden="true" />
              <span>Display quote only, not execution gate</span>
            </span>
            <span className="text-[0.7rem] text-neutral-500">Execution price requires Command Center quote gate</span>
          </div>
          <div className="flex items-center gap-2">
            {!priceLoading && !priceData && !selected.symbol.includes('USD') && (
              <button
                className="btn-secondary px-3 py-1.5 text-xs font-semibold rounded-md border border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700"
                onClick={() => fetchPrice(selected.symbol)}
              >
                Retry quote
              </button>
            )}
            {!priceLoading && priceData && (
              <div className="flex items-center gap-2 font-mono font-bold text-sm">
                <span
                  className={cn(
                    'data-update-flash',
                    priceData.change >= 0 ? 'data-update-flash--up text-emerald-400' : 'data-update-flash--down text-rose-400'
                  )}
                >
                  ฿{priceData.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                {priceData.change != null && (
                  <span className={cn('text-xs flex items-center gap-0.5', priceData.change >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                    {priceData.change >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    {priceData.change >= 0 ? '+' : ''}
                    {priceData.changePct?.toFixed(2)}%
                  </span>
                )}
              </div>
            )}
            <button
              className="px-3 py-1.5 text-xs font-semibold rounded-md border border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700"
              onClick={handleOpenDetail}
              aria-label={`Open ${selectedSymbol} detail`}
            >
              Open detail
            </button>
            <button
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-500 text-neutral-950 hover:bg-emerald-400"
              onClick={() => handleQuickAnalyze(selected.symbol)}
              aria-label={`Quick analyze ${selectedSymbol}`}
            >
              <Zap size={14} fill="currentColor" />
              Quick analyze
            </button>
          </div>
        </div>

        <div className="flex-1 border border-neutral-800 rounded-xl overflow-hidden bg-neutral-900/40">
          <TradingViewChart symbol={selected.symbol} />
        </div>
      </section>
    </div>
  );
}

TradingViewChart.propTypes = { symbol: PropTypes.string.isRequired };
TickerRow.propTypes = {
  ticker: PropTypes.shape({ symbol: PropTypes.string.isRequired, name: PropTypes.string, market: PropTypes.string }).isRequired,
  isActive: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
  onAnalyze: PropTypes.func.isRequired,
};
