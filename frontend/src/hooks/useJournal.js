import { useMemo } from 'react';
import { useApi } from './useApi.js';

function normalizeTrades(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.trades)) return payload.trades;
  return [];
}

function isClosedTrade(trade) {
  return String(trade?.status || '').toUpperCase() === 'CLOSED';
}

function isOpenTrade(trade) {
  return String(trade?.status || '').toUpperCase() === 'OPEN';
}

function numberValue(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function buildStats(trades) {
  const closedTrades = trades.filter(isClosedTrade);
  const openTrades = trades.filter(isOpenTrade);

  return {
    totalTrades: trades.length,
    openTrades: openTrades.length,
    closedTrades: closedTrades.length,
    realizedProfit: closedTrades.reduce((sum, trade) => sum + numberValue(trade.profit), 0),
  };
}

export function useJournal(options = {}) {
  const { getToken, staleMs = 30000 } = options;
  const api = useApi('/api/journal', { getToken, staleMs });
  const trades = useMemo(() => normalizeTrades(api.data), [api.data]);
  const closedTrades = useMemo(() => trades.filter(isClosedTrade), [trades]);
  const stats = useMemo(() => buildStats(trades), [trades]);
  const status = api.status === 'OK' && trades.length === 0 ? 'EMPTY' : api.status;

  return {
    ...api,
    status,
    trades,
    closedTrades,
    stats,
  };
}
