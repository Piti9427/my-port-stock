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
      positive: 'metric-card-change-positive border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
      negative: 'metric-card-change-negative border-rose-500/30 bg-rose-500/10 text-rose-400',
      neutral: 'metric-card-change-neutral border-neutral-800 bg-neutral-800/40 text-neutral-400',
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
    <article className={cn('flex flex-col gap-3 min-w-0 p-4 border border-neutral-800 rounded-lg bg-neutral-900/60 backdrop-blur-sm', className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-neutral-400 leading-tight">{label}</span>
        {change && <span className={changeBadgeVariants({ type: validChangeType })}>{change}</span>}
      </div>
      <div className={cn('metric-card-value text-[1.65rem] font-bold leading-none text-neutral-100 tabular-nums', mono && 'font-mono')}>{value}</div>
      {points && (
        <svg className="w-full h-8 text-emerald-500" viewBox="0 0 100 32" aria-hidden="true">
          <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
      )}
      {dataStamp && <DataStamp source={dataStamp} />}
    </article>
  );
}
