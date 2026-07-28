import { cn } from '@/lib/utils';

function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="w-full overflow-x-auto border border-neutral-800 rounded-lg bg-neutral-900/40" aria-hidden="true" data-testid="table-skeleton">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-neutral-900 border-b border-neutral-800 text-neutral-400">
          <tr>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <th key={colIndex} className="p-3">
                <span className="block h-3.5 w-16 bg-neutral-800 rounded animate-pulse" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800/60">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} data-testid="table-skeleton-row">
              {Array.from({ length: columns }).map((__, colIndex) => (
                <td key={colIndex} className="p-3">
                  <span className="block h-4 w-4/5 bg-neutral-800/80 rounded animate-pulse" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Skeleton({ variant = 'text', rows = 5, columns = 4, width = undefined, height = undefined, className = '' }) {
  if (variant === 'table') {
    return <TableSkeleton rows={rows} columns={columns} />;
  }

  return (
    <span
      className={cn('inline-block bg-neutral-800 rounded animate-pulse', variant === 'text' && 'h-4 w-full', className)}
      data-testid={`skeleton-${variant}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}
