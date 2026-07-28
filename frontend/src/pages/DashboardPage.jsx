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
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto flex flex-col gap-6 animate-fadeIn">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
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

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
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
