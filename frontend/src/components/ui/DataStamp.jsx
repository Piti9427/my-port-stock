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
    <span className={cn('inline-flex items-center gap-1.5 text-[0.7rem] font-mono text-neutral-400', className)}>
      <Clock size={12} className="shrink-0 text-neutral-500" aria-hidden="true" />
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
          <span className="text-rose-400 font-semibold px-1 bg-rose-500/10 rounded" aria-label="Stale data">
            Stale
          </span>
        </>
      )}
    </span>
  );
}
