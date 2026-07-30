import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { DataStamp } from './DataStamp.jsx';

function sparklinePoints(data) {
  if (!Array.isArray(data) || data.length < 2) return '';
  const values = data.map(Number).filter(Number.isFinite);
  if (values.length < 2) return '';

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 28 - ((value - min) / range) * 24;
      return `${x},${y}`;
    })
    .join(' ');
}

const changeBadgeVariants = cva('shrink-0 px-1.5 py-0.5 border rounded text-[0.72rem] font-mono transition-colors', {
  variants: {
    type: {
      positive: 'border-fin-profit bg-fin-profit-dim text-fin-profit',
      negative: 'border-fin-loss bg-fin-loss-dim text-fin-loss',
      neutral: 'border-border bg-muted text-text-secondary',
    },
  },
  defaultVariants: {
    type: 'neutral',
  },
});

export function MetricCard({
  label,
  value,
  change = null,
  changeType = 'neutral',
  sparklineData = null,
  dataStamp = null,
  mono = false,
  className = '',
}) {
  const points = sparklinePoints(sparklineData);
  const normalizedChangeType = ['positive', 'negative', 'neutral'].includes(changeType) ? changeType : 'neutral';
  /** @type {'positive' | 'negative' | 'neutral'} */
  const validChangeType = /** @type {any} */ (normalizedChangeType);

  return (
    <article
      className={cn(
        'flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-surface p-4 text-foreground transition-colors duration-200 hover:border-border-hover',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[0.72rem] font-semibold uppercase leading-tight tracking-wider text-text-secondary">{label}</span>
        {change && <span className={changeBadgeVariants({ type: validChangeType })}>{change}</span>}
      </div>
      <div className={cn('text-[1.75rem] font-bold leading-none tracking-tight text-foreground tabular-nums', mono && 'font-mono')}>{value}</div>
      {points && (
        <svg className="h-8 w-full text-fin-profit" viewBox="0 0 100 32" aria-hidden="true">
          <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
      )}
      {dataStamp && <DataStamp source={dataStamp} />}
    </article>
  );
}
