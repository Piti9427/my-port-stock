import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const STATUS_LABELS = {
  buy: 'Buy',
  hold: 'Hold',
  avoid: 'Avoid',
  wait: 'Wait',
  open: 'Open',
  closed: 'Closed',
  insufficient_data: 'Insufficient data',
};

const badgeVariants = cva('inline-flex items-center min-h-[22px] px-2 py-0.5 border rounded-md text-xs font-bold transition-colors', {
  variants: {
    intent: {
      buy: 'border-fin-profit bg-fin-profit-dim text-fin-profit',
      open: 'border-fin-profit bg-fin-profit-dim text-fin-profit',
      hold: 'border-fin-warning bg-fin-warning-dim text-fin-warning',
      wait: 'border-fin-warning bg-fin-warning-dim text-fin-warning',
      avoid: 'border-fin-loss bg-fin-loss-dim text-fin-loss',
      closed: 'border-fin-loss bg-fin-loss-dim text-fin-loss',
      insufficient_data: 'border-border bg-muted text-text-secondary',
    },
  },
  defaultVariants: {
    intent: 'wait',
  },
});

export function StatusBadge({ status = 'wait', label = null, className = '' }) {
  const normalizedStatus = String(status).trim().toLowerCase().replace(/\s+/g, '_');
  const displayLabel = label || STATUS_LABELS[normalizedStatus] || normalizedStatus.replace(/_/g, ' ');
  /** @type {'buy' | 'wait' | 'open' | 'closed' | 'hold' | 'avoid' | 'insufficient_data'} */
  const intent = /** @type {any} */ (STATUS_LABELS[normalizedStatus] ? normalizedStatus : 'wait');

  return <span className={cn(badgeVariants({ intent }), className)}>{displayLabel}</span>;
}
