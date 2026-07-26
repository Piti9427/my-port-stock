import { describe, test, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useToday } from '../src/hooks/useToday';
import { useApi } from '../src/hooks/useApi';

vi.mock('../src/hooks/useApi', () => ({
  useApi: vi.fn(),
}));

describe('useToday', () => {
  test('normalizeQueue handles array input', () => {
    useApi.mockReturnValue({ data: ['item1', 'item2'], status: 'OK' });
    const { result } = renderHook(() => useToday());
    expect(result.current.queue).toEqual(['item1', 'item2']);
    expect(result.current.status).toBe('OK');
  });

  test('normalizeQueue handles { queue: [...] } wrapper', () => {
    useApi.mockReturnValue({ data: { queue: ['item1'] }, status: 'OK' });
    const { result } = renderHook(() => useToday());
    expect(result.current.queue).toEqual(['item1']);
  });

  test('normalizeQueue handles null/undefined returning empty array', () => {
    useApi.mockReturnValue({ data: null, status: 'OK' });
    const { result } = renderHook(() => useToday());
    expect(result.current.queue).toEqual([]);
  });

  test('normalizePulse handles valid pulse object', () => {
    const pulseObj = { totalValue: 1000 };
    useApi.mockReturnValue({ data: { pulse: pulseObj }, status: 'OK' });
    const { result } = renderHook(() => useToday());
    expect(result.current.pulse).toBe(pulseObj);
  });

  test('normalizePulse handles missing pulse with default object', () => {
    useApi.mockReturnValue({ data: null, status: 'OK' });
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
    useApi.mockReturnValue({ data: { queue: [] }, status: 'OK' });
    const { result } = renderHook(() => useToday());
    expect(result.current.status).toBe('EMPTY');
  });

  test('status maps OK with non-empty queue to OK', () => {
    useApi.mockReturnValue({ data: { queue: ['item'] }, status: 'OK' });
    const { result } = renderHook(() => useToday());
    expect(result.current.status).toBe('OK');
  });

  test('status ERROR passes through', () => {
    useApi.mockReturnValue({ data: null, status: 'ERROR' });
    const { result } = renderHook(() => useToday());
    expect(result.current.status).toBe('ERROR');
  });
});
