import { Clock } from 'lucide-react';

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

export function DataStamp({ source, timestamp, stale = false }) {
  const formattedTimestamp = formatTimestamp(timestamp);

  return (
    <span className="data-stamp ui-data-stamp">
      <Clock size={12} aria-hidden="true" />
      <span>{source}</span>
      {formattedTimestamp && (
        <>
          <span aria-hidden="true">/</span>
          <time dateTime={timestamp}>{formattedTimestamp}</time>
        </>
      )}
      {stale && (
        <>
          <span aria-hidden="true">/</span>
          <span className="data-stamp-stale" aria-label="Stale data">
            Stale
          </span>
        </>
      )}
    </span>
  );
}
