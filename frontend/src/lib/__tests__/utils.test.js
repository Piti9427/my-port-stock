import { describe, it, expect } from 'vitest';
import { cn } from '../utils';
import { cva } from 'class-variance-authority';

describe('Tailwind Utility & Dynamic Class Safety', () => {
  it('correctly merges overlapping Tailwind classes without specificity issues', () => {
    // tailwind-merge must resolve conflicts correctly
    const result = cn('bg-red-500 p-4', 'bg-blue-500 p-6');
    expect(result).toBe('bg-blue-500 p-6');
  });

  it('handles conditional class mappings safely', () => {
    const isProfit = true;
    const result = cn('font-mono tabular-nums text-sm', isProfit ? 'text-emerald-400 font-semibold' : 'text-rose-400');
    expect(result).toContain('text-emerald-400');
    expect(result).not.toContain('text-rose-400');
  });

  it('validates cva variant generator for Financial Badges', () => {
    const badgeVariants = cva('inline-flex items-center rounded-md px-2 py-1 text-xs font-medium', {
      variants: {
        intent: {
          buy: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
          sell: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
          wait: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
        },
      },
      defaultVariants: {
        intent: 'wait',
      },
    });

    expect(badgeVariants({ intent: 'buy' })).toContain('text-emerald-400');
    expect(badgeVariants({ intent: 'sell' })).toContain('text-rose-400');
    expect(badgeVariants()).toContain('text-amber-400');
  });
});
