import { describe, test, expect } from 'vitest';
import { currencySymbol, formatCurrency, formatCurrencyCompact, formatPercent } from '../src/lib/format';

describe('format utilities', () => {
  describe('currencySymbol', () => {
    test('returns ฿ for .BK tickers', () => {
      expect(currencySymbol('PTT.BK')).toBe('฿');
    });
    test('returns ฿ when no ticker is provided', () => {
      expect(currencySymbol()).toBe('฿');
    });
    test('returns $ for USD tickers', () => {
      expect(currencySymbol('AAPL')).toBe('$');
    });
  });

  describe('formatCurrency', () => {
    test('returns — for NaN', () => {
      expect(formatCurrency(NaN, 'AAPL')).toBe('—');
    });
    test('returns — for undefined', () => {
      expect(formatCurrency(undefined, 'AAPL')).toBe('—');
    });
    test('returns — for null', () => {
      expect(formatCurrency(null, 'AAPL')).toBe('—');
    });
    test('returns — for Infinity', () => {
      expect(formatCurrency(Infinity, 'AAPL')).toBe('—');
    });
    test('formats zero', () => {
      expect(formatCurrency(0, 'AAPL')).toBe('$0.00');
    });
    test('formats positive value with standard ticker', () => {
      expect(formatCurrency(1234.56, 'AAPL')).toBe('$1,234.56');
    });
    test('formats positive value with Thai ticker', () => {
      expect(formatCurrency(1234.56, 'PTT.BK')).toBe('฿1,234.56');
    });
    test('formats negative value', () => {
      expect(formatCurrency(-1234.56, 'AAPL')).toBe('-$1,234.56');
    });
    test('formats with signed option for positive', () => {
      expect(formatCurrency(1234.56, 'AAPL', { signed: true })).toBe('+$1,234.56');
    });
    test('formats with signed option for negative', () => {
      expect(formatCurrency(-1234.56, 'AAPL', { signed: true })).toBe('-$1,234.56');
    });
    test('formats with custom decimals', () => {
      expect(formatCurrency(1234.5678, 'AAPL', { decimals: 3 })).toBe('$1,234.568');
    });
  });

  describe('formatCurrencyCompact', () => {
    test('returns — for NaN', () => {
      expect(formatCurrencyCompact(NaN, 'AAPL')).toBe('—');
    });
    test('formats < 1000', () => {
      expect(formatCurrencyCompact(999, 'AAPL')).toBe('$999');
    });
    test('formats >= 1000', () => {
      expect(formatCurrencyCompact(1000, 'AAPL')).toBe('$1k');
    });
    test('formats >= 1000 with decimals', () => {
      expect(formatCurrencyCompact(1200, 'AAPL')).toBe('$1k');
    });
    test('formats < 1M', () => {
      expect(formatCurrencyCompact(999999, 'AAPL')).toBe('$1000k');
    });
    test('formats >= 1M', () => {
      expect(formatCurrencyCompact(1000000, 'AAPL')).toBe('$1.0M');
    });
    test('formats negative compact', () => {
      expect(formatCurrencyCompact(-1500000, 'AAPL')).toBe('-$1.5M');
    });
    test('formats 0', () => {
      expect(formatCurrencyCompact(0, 'AAPL')).toBe('$0');
    });
  });

  describe('formatPercent', () => {
    test('returns — for NaN', () => {
      expect(formatPercent(NaN)).toBe('—');
    });
    test('formats standard positive percent', () => {
      expect(formatPercent(5.32)).toBe('5.32%');
    });
    test('formats standard negative percent', () => {
      expect(formatPercent(-5.32)).toBe('-5.32%');
    });
    test('formats signed positive percent', () => {
      expect(formatPercent(5.32, { signed: true })).toBe('+5.32%');
    });
    test('formats signed negative percent', () => {
      expect(formatPercent(-5.32, { signed: true })).toBe('-5.32%');
    });
    test('formats with custom decimals', () => {
      expect(formatPercent(5.3219, { decimals: 3 })).toBe('5.322%');
    });
  });
});
