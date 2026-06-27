function tradeTime(trade) {
  const parsed = Date.parse(trade.date || trade.closed_at || trade.created_at);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function formatMoney(value, { sign = false } = {}) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  const prefix = sign && numeric > 0 ? '+' : '';
  return `${prefix}${numeric < 0 ? '-' : ''}฿${Math.abs(numeric).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function buildAnalyticsStats(trades) {
  const winners = trades.filter((trade) => Number(trade.profit) > 0);
  const losers = trades.filter((trade) => Number(trade.profit) < 0);
  const totalPl = trades.reduce((sum, trade) => sum + Number(trade.profit || 0), 0);
  const avgWin = winners.length ? winners.reduce((sum, trade) => sum + Number(trade.profit || 0), 0) / winners.length : 0;
  const avgLoss = losers.length ? Math.abs(losers.reduce((sum, trade) => sum + Number(trade.profit || 0), 0) / losers.length) : 0;
  const bestTrade = trades.reduce((best, trade) => (Number(trade.profit) > Number(best?.profit ?? -Infinity) ? trade : best), null);
  const worstTrade = trades.reduce((worst, trade) => (Number(trade.profit) < Number(worst?.profit ?? Infinity) ? trade : worst), null);

  return {
    total: trades.length,
    winRate: trades.length ? Math.round((winners.length / trades.length) * 100) : null,
    winLossRatio: avgLoss > 0 ? avgWin / avgLoss : null,
    totalPl,
    bestTrade,
    worstTrade,
  };
}

export function buildEquityPoints(trades) {
  let cumulative = 0;
  return [...trades]
    .sort((left, right) => tradeTime(left) - tradeTime(right))
    .map((trade) => {
      cumulative += Number(trade.profit || 0);
      return { trade, value: cumulative };
    });
}
