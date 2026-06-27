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
  const totalValue = holdings.reduce((sum, holding) => {
    if (holding.sector) sectors.add(holding.sector);
    return sum + numberValue(holding.shares) * numberValue(holding.price);
  }, 0);

  return {
    holdingsCount: holdings.length,
    totalValue,
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
