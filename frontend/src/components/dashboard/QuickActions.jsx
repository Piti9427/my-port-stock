import { BookOpen, Plus, Search } from 'lucide-react';

export function QuickActions({ onAnalyze, onLogTrade, onAddWatchlist }) {
  return (
    <section className="dashboard-quick-actions" aria-labelledby="dashboard-quick-actions-title">
      <h2 id="dashboard-quick-actions-title">Quick Actions</h2>
      <div className="dashboard-quick-actions-list">
        <button type="button" onClick={onAnalyze}>
          <Search size={16} aria-hidden="true" />
          วิเคราะห์หุ้น
        </button>
        <button type="button" onClick={onLogTrade}>
          <BookOpen size={16} aria-hidden="true" />
          บันทึกเทรด
        </button>
        <button type="button" onClick={onAddWatchlist}>
          <Plus size={16} aria-hidden="true" />
          เพิ่ม Watchlist
        </button>
      </div>
    </section>
  );
}
