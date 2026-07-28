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
      buy: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
      open: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
      hold: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
      wait: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
      avoid: 'border-rose-500/30 bg-rose-500/10 text-rose-400',
      closed: 'border-rose-500/30 bg-rose-500/10 text-rose-400',
      insufficient_data: 'border-neutral-700 bg-neutral-800/40 text-neutral-400',
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

  return <span className={cn(badgeVariants({ intent }), `status-badge-${normalizedStatus}`, className)}>{displayLabel}</span>;
}
