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
  let totalValueThb = 0;
  let totalWeightedBeta = 0;
  let totalBetaWeight = 0;

  holdings.forEach((holding) => {
    if (holding.sector) sectors.add(holding.sector);
    const valThb = numberValue(holding.value_thb || (numberValue(holding.shares) * numberValue(holding.price || holding.avg_cost) * (holding.fx_rate || 1.0)));
    totalValueThb += valThb;

    const beta = numberValue(holding.beta ?? 1.0);
    totalWeightedBeta += beta * valThb;
    totalBetaWeight += valThb;
  });

  const portfolioBeta = totalBetaWeight > 0 ? Number((totalWeightedBeta / totalBetaWeight).toFixed(2)) : 1.0;

  return {
    holdingsCount: holdings.length,
    totalValue: totalValueThb,
    portfolioBeta,
    sectorCount: sectors.size,
  };
}

export function usePortfolio(options = {}) {
  const { getToken, staleMs = 30000 } = options;
  const api = useApi('/api/holdings', { getToken, staleMs });
  const holdings = useMemo(() => normalizeHoldings(api.data), [api.data]);
  const usdThbRate = api.data?.usd_thb_rate || 35.0;
  const summary = useMemo(() => buildSummary(holdings), [holdings]);
  const status = api.status === 'OK' && holdings.length === 0 ? 'EMPTY' : api.status;

  return {
    ...api,
    status,
    holdings,
    summary,
    usdThbRate,
  };
}
