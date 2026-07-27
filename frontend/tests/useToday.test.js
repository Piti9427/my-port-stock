import { describe, test, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useToday } from '../src/hooks/useToday';
import { useApi } from '../src/hooks/useApi';

vi.mock('../src/hooks/useApi', () => ({
  useApi: vi.fn(),
}));

const mockedUseApi = vi.mocked(useApi);
const apiResult = (data, status = 'OK') => ({
  data,
  loading: false,
  error: null,
  status,
  meta: {},
  isStale: false,
  refetch: vi.fn(async () => null),
});

describe('useToday', () => {
  test('normalizeQueue handles array input', () => {
    mockedUseApi.mockReturnValue(apiResult(['item1', 'item2']));
    const { result } = renderHook(() => useToday());
    expect(result.current.queue).toEqual(['item1', 'item2']);
    expect(result.current.status).toBe('OK');
  });

  test('normalizeQueue handles { queue: [...] } wrapper', () => {
    mockedUseApi.mockReturnValue(apiResult({ queue: ['item1'] }));
    const { result } = renderHook(() => useToday());
    expect(result.current.queue).toEqual(['item1']);
  });

  test('normalizeQueue handles null/undefined returning empty array', () => {
    mockedUseApi.mockReturnValue(apiResult(null));
    const { result } = renderHook(() => useToday());
    expect(result.current.queue).toEqual([]);
  });

  test('normalizePulse handles valid pulse object', () => {
    const pulseObj = { totalValue: 1000 };
    mockedUseApi.mockReturnValue(apiResult({ pulse: pulseObj }));
    const { result } = renderHook(() => useToday());
    expect(result.current.pulse).toBe(pulseObj);
  });

  test('normalizePulse handles missing pulse with default object', () => {
    mockedUseApi.mockReturnValue(apiResult(null));
    const { result } = renderHook(() => useToday());
    expect(result.current.pulse).toEqual({
      totalValue: 0,
      totalCost: 0,
      totalPl: 0,
      drawdownPct: 0,
      portfolioBeta: 1.0,
      speculativeWeightPct: 0,
      missingStopCount: 0,
      sectorBreaches: [],
      maxDrawdownPct: 15,
    });
  });

  test('status maps OK with empty queue to EMPTY', () => {
    mockedUseApi.mockReturnValue(apiResult({ queue: [] }));
    const { result } = renderHook(() => useToday());
    expect(result.current.status).toBe('EMPTY');
  });

  test('status maps OK with non-empty queue to OK', () => {
    mockedUseApi.mockReturnValue(apiResult({ queue: ['item'] }));
    const { result } = renderHook(() => useToday());
    expect(result.current.status).toBe('OK');
  });

  test('status ERROR passes through', () => {
    mockedUseApi.mockReturnValue(apiResult(null, 'ERROR'));
    const { result } = renderHook(() => useToday());
    expect(result.current.status).toBe('ERROR');
  });
});
