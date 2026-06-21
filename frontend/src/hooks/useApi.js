import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchWithAuth } from '../lib/api.js';

function statusFromPayload(payload) {
  if (payload?.status === 'INSUFFICIENT_DATA') return 'INSUFFICIENT_DATA';
  if (isEmptyPayload(payload)) return 'EMPTY';
  return 'OK';
}

function isEmptyPayload(payload) {
  if (payload === null || payload === undefined) return true;
  if (Array.isArray(payload)) return payload.length === 0;
  if (typeof payload !== 'object') return false;

  for (const key of ['holdings', 'trades', 'watchlists', 'items']) {
    if (Array.isArray(payload[key])) {
      return payload[key].length === 0;
    }
  }

  return Object.keys(payload).length === 0;
}

function statusFromError(error) {
  if (error?.status === 401) return 'UNAUTHORIZED';
  return 'ERROR';
}

function extractMeta(payload) {
  if (!payload || typeof payload !== 'object') return {};

  const meta = {};
  for (const key of ['as_of', 'source', 'quote_timestamp', 'market_session', 'current_price_acceptance_gate', 'status']) {
    if (payload[key] !== undefined) {
      meta[key] = payload[key];
    }
  }
  return meta;
}

function isAbortError(error) {
  return error?.name === 'AbortError';
}

export function useApi(url, options = {}) {
  const { enabled = true, getToken, initialData = null, requestOptions = {}, staleMs = 0 } = options;
  const [state, setState] = useState(() => ({
    data: initialData,
    loading: Boolean(enabled && url),
    error: null,
    status: initialData ? 'OK' : 'IDLE',
    meta: {},
    fetchedAt: null,
  }));
  const [now, setNow] = useState(() => Date.now());
  const abortRef = useRef(null);
  const getTokenRef = useRef(getToken);
  const requestOptionsRef = useRef(requestOptions);
  const requestKey = JSON.stringify(requestOptions);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    requestOptionsRef.current = requestOptions;
  }, [requestKey, requestOptions]);

  const refetch = useCallback(async () => {
    if (!enabled || !url) {
      setState((current) => ({
        ...current,
        loading: false,
        status: current.data ? current.status : 'IDLE',
      }));
      return null;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

    try {
      const payload = await fetchWithAuth(url, getTokenRef.current, {
        ...requestOptionsRef.current,
        signal: controller.signal,
      });

      if (controller.signal.aborted) return null;

      setNow(Date.now());
      setState({
        data: payload,
        loading: false,
        error: null,
        status: statusFromPayload(payload),
        meta: extractMeta(payload),
        fetchedAt: Date.now(),
      });
      return payload;
    } catch (error) {
      if (isAbortError(error)) return null;

      setState((current) => ({
        ...current,
        loading: false,
        error,
        status: statusFromError(error),
      }));
      return null;
    }
  }, [enabled, url]);

  useEffect(() => {
    refetch();

    return () => {
      abortRef.current?.abort();
    };
  }, [refetch, requestKey]);

  useEffect(() => {
    if (!state.fetchedAt || staleMs <= 0) return undefined;

    const elapsed = now - state.fetchedAt;
    if (elapsed >= staleMs) return undefined;

    const timeout = setTimeout(() => setNow(Date.now()), staleMs - elapsed + 1);
    return () => clearTimeout(timeout);
  }, [now, staleMs, state.fetchedAt]);

  const isStale = Boolean(state.fetchedAt && staleMs > 0 && now - state.fetchedAt > staleMs);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    status: state.status,
    meta: state.meta,
    isStale,
    refetch,
  };
}
