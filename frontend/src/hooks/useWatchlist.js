import { useCallback, useMemo } from 'react';
import { fetchWithAuth } from '../lib/api.js';
import { useApi } from './useApi.js';

function normalizeItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.watchlists)) return payload.watchlists;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function normalizeAlert(item) {
  const alertPrice = Number(item?.alertPrice ?? item?.alert_price);
  if (!Number.isFinite(alertPrice) || alertPrice <= 0) return null;

  return {
    ticker: item.ticker,
    alertPrice,
    alertType: item.alertType || item.alert_type || 'above',
  };
}

export function useWatchlist(options = {}) {
  const { getToken, staleMs = 30000 } = options;
  const api = useApi('/api/watchlists', { getToken, staleMs });
  const { refetch } = api;
  const items = useMemo(() => normalizeItems(api.data), [api.data]);
  const alerts = useMemo(() => items.map(normalizeAlert).filter(Boolean), [items]);
  const status = api.status === 'OK' && items.length === 0 ? 'EMPTY' : api.status;

  const add = useCallback(
    async (entry) => {
      const result = await fetchWithAuth('/api/watchlists', getToken, {
        method: 'POST',
        body: entry,
      });
      await refetch();
      return result;
    },
    [getToken, refetch]
  );

  const remove = useCallback(
    async (ticker) => {
      const normalizedTicker = String(ticker || '')
        .trim()
        .toUpperCase();
      const result = await fetchWithAuth(`/api/watchlists/${encodeURIComponent(normalizedTicker)}`, getToken, {
        method: 'DELETE',
      });
      await refetch();
      return result;
    },
    [getToken, refetch]
  );

  return {
    ...api,
    status,
    items,
    alerts,
    add,
    remove,
  };
}
