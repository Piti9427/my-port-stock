import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { currencySymbol, formatCurrency, formatCurrencyCompact, formatPercent } from '../src/lib/format.js';

describe('financial formatter properties', () => {
  test('finite values always format without NaN or Infinity leakage', () => {
    fc.assert(
      fc.property(fc.double({ noNaN: true, noDefaultInfinity: true }), fc.string(), (value, ticker) => {
        for (const output of [formatCurrency(value, ticker), formatCurrencyCompact(value, ticker), formatPercent(value)]) {
          expect(output).not.toMatch(/NaN|Infinity/);
          expect(output.length).toBeGreaterThan(0);
        }
      }),
      { verbose: true }
    );
  });

  test('non-finite values fail closed to an em dash', () => {
    fc.assert(
      fc.property(fc.constantFrom(Number.NaN, Infinity, -Infinity), fc.string(), (value, ticker) => {
        expect(formatCurrency(value, ticker)).toBe('—');
        expect(formatCurrencyCompact(value, ticker)).toBe('—');
        expect(formatPercent(value)).toBe('—');
      }),
      { verbose: true }
    );
  });

  test('only exact .BK suffixes select THB across Unicode ticker boundaries', () => {
    fc.assert(
      fc.property(fc.string(), (prefix) => {
        expect(currencySymbol(`${prefix}.BK`)).toBe('฿');
        expect(currencySymbol(`${prefix}.bk`)).toBe('$');
        expect(currencySymbol(`${prefix}.BKX`)).toBe('$');
      }),
      { verbose: true }
    );
  });

  test('negative values retain a leading minus sign under locale formatting', () => {
    fc.assert(
      fc.property(fc.double({ min: Number.MIN_VALUE, noNaN: true, noDefaultInfinity: true }), fc.string(), (magnitude, ticker) => {
        expect(formatCurrency(-Math.abs(magnitude), ticker)).toMatch(/^-/);
      }),
      { verbose: true }
    );
  });
});
