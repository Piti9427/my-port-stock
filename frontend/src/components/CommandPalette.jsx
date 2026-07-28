import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router';
import { BarChart2, BookOpen, Bot, Crosshair, LayoutDashboard, Search, Settings2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../auth/clerkAdapter';
import { usePortfolio } from '../hooks/usePortfolio';
import { useWatchlist } from '../hooks/useWatchlist';
import { cn } from '../lib/utils';

const PAGE_COMMANDS = [
  { id: 'page-dashboard', type: 'page', label: 'แดชบอร์ด', description: 'Overview', shortcut: 'g d', to: '/', icon: LayoutDashboard },
  { id: 'page-risk', type: 'page', label: 'ความเสี่ยง', description: 'Portfolio risk', shortcut: 'g r', to: '/risk', icon: ShieldAlert },
  { id: 'page-command', type: 'page', label: 'วิเคราะห์หุ้น', description: 'Command Center', shortcut: 'g a', to: '/command-center', icon: Bot },
  { id: 'page-market', type: 'page', label: 'สำรวจตลาด', description: 'Market Explorer', shortcut: 'g m', to: '/market', icon: Crosshair },
  { id: 'page-journal', type: 'page', label: 'บันทึกเทรด', description: 'Trade Journal', shortcut: 'g j', to: '/journal', icon: BookOpen },
  {
    id: 'page-analytics',
    type: 'page',
    label: 'สถิติผลงาน',
    description: 'Performance analytics',
    shortcut: 'g v',
    to: '/analytics',
    icon: BarChart2,
  },
  { id: 'page-config', type: 'page', label: 'ตั้งค่าระบบ', description: 'Config', shortcut: 'g c', to: '/config', icon: Settings2 },
];

function normalizeTicker(value) {
  return String(value || '')
    .trim()
    .toUpperCase();
}

function buildTickerCommands({ holdings = [], watchlist = [] }) {
  const byTicker = new Map();

  for (const holding of holdings) {
    const ticker = normalizeTicker(holding.ticker);
    if (!ticker) continue;
    byTicker.set(ticker, {
      id: `ticker-${ticker}`,
      type: 'ticker',
      ticker,
      label: `$${ticker}`,
      description: holding.name || holding.sector || 'Portfolio holding',
      to: `/ticker/${ticker}`,
    });
  }

  for (const item of watchlist) {
    const ticker = normalizeTicker(item.ticker);
    if (!ticker || byTicker.has(ticker)) continue;
    byTicker.set(ticker, {
      id: `ticker-${ticker}`,
      type: 'ticker',
      ticker,
      label: `$${ticker}`,
      description: item.sector || item.signal || 'Watchlist ticker',
      to: `/ticker/${ticker}`,
    });
  }

  return [...byTicker.values()].sort((a, b) => a.ticker.localeCompare(b.ticker));
}

function commandMatches(command, query) {
  if (!query) return true;
  const searchable = [command.label, command.description, command.shortcut, command.ticker, command.type].filter(Boolean).join(' ').toLowerCase();
  return searchable.includes(query.toLowerCase());
}

export default function CommandPalette({ open, onOpenChange }) {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const dialogRef = useRef(null);
  const inputRef = useRef(null);
  const previousFocusRef = useRef(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const portfolio = usePortfolio({ getToken });
  const watchlist = useWatchlist({ getToken });

  const commands = useMemo(() => {
    const tickerCommands = buildTickerCommands({
      holdings: portfolio.holdings,
      watchlist: watchlist.items,
    });
    return [...PAGE_COMMANDS, ...tickerCommands];
  }, [portfolio.holdings, watchlist.items]);

  const filteredCommands = useMemo(() => commands.filter((command) => commandMatches(command, query)).slice(0, 12), [commands, query]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const isPaletteShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (!isPaletteShortcut) return;
      event.preventDefault();
      previousFocusRef.current = document.activeElement;
      onOpenChange(true);
    };

    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) return;
    if (!previousFocusRef.current || dialogRef.current?.contains(previousFocusRef.current)) {
      previousFocusRef.current = document.activeElement;
    }
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const close = () => {
    const previousFocus = previousFocusRef.current;
    setQuery('');
    onOpenChange(false);
    requestAnimationFrame(() => previousFocus?.focus());
  };

  const selectCommand = (command) => {
    if (!command) return;
    navigate(command.to);
    close();
  };

  const handleCommandClick = (event) => {
    const to = event.currentTarget.dataset.to;
    if (!to) return;
    navigate(to);
    close();
  };

  const handleInputKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, filteredCommands.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      selectCommand(filteredCommands[activeIndex]);
    }
  };

  const handleQueryChange = (event) => {
    setQuery(event.target.value);
    setActiveIndex(0);
  };

  const handleDialogKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }

    if (event.key !== 'Tab') return;
    const focusable = Array.from(dialogRef.current?.querySelectorAll('input, button:not([disabled])') || []);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable.at(-1);

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-overlay px-4 pb-4 pt-24" onClick={close}>
      <div
        ref={dialogRef}
        className="w-full max-w-[640px] overflow-hidden rounded-md border border-border bg-surface-elevated"
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleDialogKeyDown}
      >
        <div className="flex items-center gap-2 border-b border-border px-3.5 py-3 text-text-secondary">
          <Search size={16} aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            role="searchbox"
            aria-label="Search commands, pages, tickers"
            placeholder="Search pages, tickers, actions..."
            value={query}
            onChange={handleQueryChange}
            onKeyDown={handleInputKeyDown}
            className="min-w-0 flex-1 border-0 bg-transparent text-foreground outline-none placeholder:text-text-secondary"
          />
          <kbd className="min-w-[22px] rounded border border-border bg-surface-raised px-[5px] py-1 text-center font-mono text-[0.7rem] leading-none text-text-secondary">
            Esc
          </kbd>
        </div>

        <div className="max-h-[min(520px,60vh)] overflow-auto p-2" role="listbox" aria-label="Command results">
          {filteredCommands.length === 0 ? (
            <div className="px-3 py-6 text-center text-text-secondary">No matching command</div>
          ) : (
            filteredCommands.map((command, index) => {
              const Icon = command.icon;
              return (
                <button
                  key={command.id}
                  type="button"
                  data-to={command.to}
                  className={cn(
                    'grid min-h-[54px] w-full grid-cols-[30px_minmax(0,1fr)_auto] items-center gap-3 rounded border border-transparent bg-transparent px-2.5 py-[9px] text-left text-text-secondary outline-none transition-colors hover:border-border hover:bg-surface hover:text-foreground focus-visible:border-border focus-visible:bg-surface focus-visible:text-foreground',
                    index === activeIndex && 'border-border bg-surface text-foreground'
                  )}
                  onClick={handleCommandClick}
                  role="option"
                  aria-selected={index === activeIndex}
                  aria-label={`${command.label} ${command.description || ''}`.trim()}
                >
                  <span className="inline-flex size-[30px] items-center justify-center rounded border border-border font-mono text-xs text-fin-profit">
                    {Icon ? <Icon size={16} aria-hidden="true" /> : command.ticker?.slice(0, 2)}
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-semibold text-foreground">{command.label}</span>
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[0.78rem] text-text-secondary">{command.description}</span>
                  </span>
                  <span className="font-mono text-xs uppercase text-text-secondary">{command.shortcut || command.type}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

CommandPalette.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
};
