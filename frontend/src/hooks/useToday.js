import { useMemo } from 'react';
import { useApi } from './useApi.js';

function normalizeQueue(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.queue)) return payload.queue;
  return [];
}

function normalizePulse(payload) {
  if (payload?.pulse && typeof payload.pulse === 'object') {
    return payload.pulse;
  }
  return {
    totalValue: 0,
    totalCost: 0,
    totalPl: 0,
    drawdownPct: 0,
    portfolioBeta: 1.0,
    speculativeWeightPct: 0,
    missingStopCount: 0,
    sectorBreaches: [],
    maxDrawdownPct: 15,
  };
}

export function useToday(options = {}) {
  const { getToken, staleMs = 60000 } = options;
  const api = useApi('/api/today', { getToken, staleMs });

  const queue = useMemo(() => normalizeQueue(api.data), [api.data]);
  const pulse = useMemo(() => normalizePulse(api.data), [api.data]);

  const status = api.status === 'OK' && queue.length === 0 ? 'EMPTY' : api.status;

  return {
    ...api,
    status,
    queue,
    pulse,
  };
}
