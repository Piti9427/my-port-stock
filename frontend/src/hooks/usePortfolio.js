import { useMemo } from 'react';
import { useApi } from './useApi.js';

function normalizeHoldings(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.holdings)) return payload.holdings;
  return [];
}

function numberValue(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function buildSummary(holdings) {
  const sectors = new Set();
  let totalValue = 0;
  let totalWeightedBeta = 0;
  let totalBetaWeight = 0;

  holdings.forEach((holding) => {
    if (holding.sector) sectors.add(holding.sector);
    const shares = numberValue(holding.shares);
    const price = numberValue(holding.price || holding.avg_cost);
    const val = shares * price;
    totalValue += val;

    const beta = numberValue(holding.beta ?? 1.0);
    totalWeightedBeta += beta * val;
    totalBetaWeight += val;
  });

  const portfolioBeta = totalBetaWeight > 0 ? Number((totalWeightedBeta / totalBetaWeight).toFixed(2)) : 1.0;

  return {
    holdingsCount: holdings.length,
    totalValue,
    portfolioBeta,
    sectorCount: sectors.size,
  };
}

export function usePortfolio(options = {}) {
  const { getToken, staleMs = 30000 } = options;
  const api = useApi('/api/holdings', { getToken, staleMs });
  const holdings = useMemo(() => normalizeHoldings(api.data), [api.data]);
  const summary = useMemo(() => buildSummary(holdings), [holdings]);
  const status = api.status === 'OK' && holdings.length === 0 ? 'EMPTY' : api.status;

  return {
    ...api,
    status,
    holdings,
    summary,
  };
}
