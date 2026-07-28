import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatTimestamp(timestamp) {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function DataStamp({ source, timestamp = null, stale = false, className = '' }) {
  const formattedTimestamp = formatTimestamp(timestamp);

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[0.7rem] font-mono text-text-secondary', className)}>
      <Clock size={12} className="shrink-0 text-text-muted" aria-hidden="true" />
      <span>{source}</span>
      {formattedTimestamp && (
        <>
          <span aria-hidden="true" className="opacity-40">
            /
          </span>
          <time dateTime={timestamp || undefined}>{formattedTimestamp}</time>
        </>
      )}
      {stale && (
        <>
          <span aria-hidden="true" className="opacity-40">
            /
          </span>
          <span className="rounded bg-fin-loss-dim px-1 font-semibold text-fin-loss" aria-label="Stale data">
            Stale
          </span>
        </>
      )}
    </span>
  );
}
