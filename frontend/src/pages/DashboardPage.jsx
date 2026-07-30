import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth/clerkAdapter';
import { AIChatCard } from '../components/dashboard/AIChatCard.jsx';
import { HoldingsTable } from '../components/dashboard/HoldingsTable.jsx';
import { PortfolioSummary } from '../components/dashboard/PortfolioSummary.jsx';
import { QuickActions } from '../components/dashboard/QuickActions.jsx';
import { WatchlistPanel } from '../components/dashboard/WatchlistPanel.jsx';
import { ScenarioPlanner } from '../components/ScenarioPlanner.jsx';
import { usePortfolio } from '../hooks/usePortfolio';
import { useWatchlist } from '../hooks/useWatchlist';

function normalizedTicker(value) {
  return String(value || '')
    .trim()
    .toUpperCase();
}

export default function DashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const portfolio = usePortfolio({ getToken });
  const watchlist = useWatchlist({ getToken });
  const [plannerTicker, setPlannerTicker] = useState('');

  const plannerHolding = useMemo(
    () => portfolio.holdings.find((holding) => normalizedTicker(holding.ticker) === plannerTicker),
    [plannerTicker, portfolio.holdings]
  );

  const openTicker = (ticker) => {
    const normalized = normalizedTicker(ticker);
    if (normalized) navigate(`/ticker/${encodeURIComponent(normalized)}`);
  };

  const openAnalysis = (ticker) => {
    const normalized = normalizedTicker(ticker);
    navigate(normalized ? `/command-center?ticker=${encodeURIComponent(normalized)}` : '/command-center');
  };

  const openPlanner = (ticker) => {
    const normalized = normalizedTicker(ticker);
    if (normalized) setPlannerTicker(normalized);
  };

  const preferredTicker = normalizedTicker(location.state?.ticker || portfolio.holdings[0]?.ticker || watchlist.items[0]?.ticker);

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 flex-col gap-4 overflow-y-auto p-4 animate-fadeIn sm:gap-6 sm:p-6">
      <div className="grid grid-cols-1 items-stretch gap-6 min-[901px]:grid-cols-[minmax(0,2fr)_minmax(240px,1fr)]">
        <PortfolioSummary
          holdings={portfolio.holdings}
          source={portfolio.meta.source || 'Supabase holdings'}
          timestamp={portfolio.meta.as_of}
          stale={portfolio.isStale}
        />
        <QuickActions
          onAnalyze={() => openAnalysis(preferredTicker)}
          onLogTrade={() => navigate('/journal')}
          onAddWatchlist={() => navigate('/market')}
        />
      </div>

      <HoldingsTable
        holdings={portfolio.holdings}
        loading={portfolio.loading}
        status={portfolio.status}
        onOpenTicker={openTicker}
        onPlan={openPlanner}
        onRetry={portfolio.refetch}
        onFirstRunAction={() => navigate('/journal')}
      />

      <div className="grid grid-cols-1 items-start gap-6 min-[901px]:grid-cols-[minmax(0,2fr)_minmax(240px,1fr)]">
        <WatchlistPanel
          items={watchlist.items}
          loading={watchlist.loading}
          status={watchlist.status}
          onOpenTicker={openTicker}
          onAnalyze={openAnalysis}
        />
        <AIChatCard initialTicker={preferredTicker} onSubmit={openAnalysis} />
      </div>

      <ScenarioPlanner
        open={Boolean(plannerTicker)}
        ticker={plannerTicker}
        holding={plannerHolding}
        onClose={() => setPlannerTicker('')}
        onLogTrade={({ ticker }) => navigate(`/journal?ticker=${encodeURIComponent(ticker)}`)}
      />
    </div>
  );
}
