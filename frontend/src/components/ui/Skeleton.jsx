import { cn, cssVars } from '@/lib/utils';

function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-border bg-surface" aria-hidden="true" data-testid="table-skeleton">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="border-b border-border bg-panel-solid text-text-secondary">
          <tr>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <th key={colIndex} className="p-3">
                <span className="block h-3.5 w-16 animate-pulse rounded bg-surface-hover" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} data-testid="table-skeleton-row">
              {Array.from({ length: columns }).map((__, colIndex) => (
                <td key={colIndex} className="p-3">
                  <span className="block h-4 w-4/5 animate-pulse rounded bg-surface-hover" />
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
      className={cn(
        'inline-block animate-pulse rounded bg-surface-hover [height:var(--skeleton-height)] [width:var(--skeleton-width)]',
        variant === 'text' && !height && 'h-4',
        variant === 'text' && !width && 'w-full',
        className
      )}
      data-testid={`skeleton-${variant}`}
      style={cssVars({ '--skeleton-width': width, '--skeleton-height': height })}
      aria-hidden="true"
    />
  );
}
