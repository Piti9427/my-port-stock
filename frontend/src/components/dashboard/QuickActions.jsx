import { BookOpen, Plus, Search } from 'lucide-react';

export function QuickActions({ onAnalyze, onLogTrade, onAddWatchlist }) {
  return (
    <section className="p-6 border border-[#262626] hover:border-[#38383a] rounded-2xl bg-[#121212] flex flex-col gap-4 transition-all duration-200 shadow-sm" aria-labelledby="dashboard-quick-actions-title">
      <h2 id="dashboard-quick-actions-title" className="text-[0.72rem] font-semibold uppercase tracking-wider text-[#a1a1aa]">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button type="button" onClick={onAnalyze} className="flex items-center justify-center gap-2 p-3 border border-[#262626] hover:border-[#38383a] rounded-xl bg-[#18181b] hover:bg-[#202024] text-xs font-semibold text-[#ededed] transition-all duration-200 active:scale-[0.98]">
          <Search size={16} aria-hidden="true" className="text-emerald-400" />
          วิเคราะห์หุ้น
        </button>
        <button type="button" onClick={onLogTrade} className="flex items-center justify-center gap-2 p-3 border border-[#262626] hover:border-[#38383a] rounded-xl bg-[#18181b] hover:bg-[#202024] text-xs font-semibold text-[#ededed] transition-all duration-200 active:scale-[0.98]">
          <BookOpen size={16} aria-hidden="true" className="text-blue-400" />
          บันทึกเทรด
        </button>
        <button type="button" onClick={onAddWatchlist} className="flex items-center justify-center gap-2 p-3 border border-[#262626] hover:border-[#38383a] rounded-xl bg-[#18181b] hover:bg-[#202024] text-xs font-semibold text-[#ededed] transition-all duration-200 active:scale-[0.98]">
          <Plus size={16} aria-hidden="true" className="text-amber-400" />
          เพิ่ม Watchlist
        </button>
      </div>
    </section>
  );
}
