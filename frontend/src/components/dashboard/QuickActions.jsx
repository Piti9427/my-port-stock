import { BookOpen, Plus, Search } from 'lucide-react';

export function QuickActions({ onAnalyze, onLogTrade, onAddWatchlist }) {
  return (
    <section
      className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface p-5 text-foreground"
      aria-labelledby="dashboard-quick-actions-title"
    >
      <h2 id="dashboard-quick-actions-title" className="m-0 text-[0.95rem] font-semibold text-foreground">
        Quick Actions
      </h2>
      <div className="mt-4 grid gap-2">
        <button
          type="button"
          onClick={onAnalyze}
          className="flex min-h-[42px] items-center gap-2 rounded-lg border border-border bg-panel-solid px-3 text-left text-xs font-semibold text-text-secondary transition-colors hover:border-border-hover hover:text-foreground"
        >
          <Search size={16} aria-hidden="true" className="text-fin-profit" />
          วิเคราะห์หุ้น
        </button>
        <button
          type="button"
          onClick={onLogTrade}
          className="flex min-h-[42px] items-center gap-2 rounded-lg border border-border bg-panel-solid px-3 text-left text-xs font-semibold text-text-secondary transition-colors hover:border-border-hover hover:text-foreground"
        >
          <BookOpen size={16} aria-hidden="true" className="text-fin-info" />
          บันทึกเทรด
        </button>
        <button
          type="button"
          onClick={onAddWatchlist}
          className="flex min-h-[42px] items-center gap-2 rounded-lg border border-border bg-panel-solid px-3 text-left text-xs font-semibold text-text-secondary transition-colors hover:border-border-hover hover:text-foreground"
        >
          <Plus size={16} aria-hidden="true" className="text-fin-warning" />
          เพิ่ม Watchlist
        </button>
      </div>
    </section>
  );
}
