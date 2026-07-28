import { describe, it, expect } from 'vitest';
import * as UI from '../index.js';
import * as LIB from '../../../lib/index.js';

describe('Shared UI & Utility Barrel Export Integrity', () => {
  it('exports all core UI primitives from @/components/ui', () => {
    expect(UI.Button).toBeDefined();
    expect(UI.Input).toBeDefined();
    expect(UI.Card).toBeDefined();
    expect(UI.Badge).toBeDefined();
    expect(UI.Dialog).toBeDefined();
    expect(UI.Progress).toBeDefined();
    expect(UI.Alert).toBeDefined();
  });

  it('exports all financial shared UI components from @/components/ui', () => {
    expect(UI.MetricCard).toBeDefined();
    expect(UI.StatusBadge).toBeDefined();
    expect(UI.DataTable).toBeDefined();
    expect(UI.DataStamp).toBeDefined();
    expect(UI.Drawer).toBeDefined();
    expect(UI.EmptyState).toBeDefined();
    expect(UI.Skeleton).toBeDefined();
    expect(UI.Toast).toBeDefined();
    expect(UI.Tooltip).toBeDefined();
  });

  it('exports all shared formatters and helpers from @/lib', () => {
    expect(LIB.cn).toBeTypeOf('function');
    expect(LIB.currencySymbol).toBeTypeOf('function');
    expect(LIB.formatCurrency).toBeTypeOf('function');
    expect(LIB.formatCurrencyCompact).toBeTypeOf('function');
    expect(LIB.formatPercent).toBeTypeOf('function');
  });

  it('executes formatCurrency and formatPercent formatters correctly', () => {
    expect(LIB.currencySymbol('NVDA')).toBe('$');
    expect(LIB.currencySymbol('BDMS.BK')).toBe('฿');
    expect(LIB.formatCurrency(142.5, 'NVDA')).toBe('$142.50');
    expect(LIB.formatCurrency(5200, 'BDMS.BK')).toBe('฿5,200.00');
    expect(LIB.formatPercent(3.45, { signed: true })).toBe('+3.45%');
  });
});
