import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { EmptyState } from './EmptyState.jsx';
import { Skeleton } from './Skeleton.jsx';

function compareValues(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true });
}

function renderCellValue(column, row) {
  const value = column.render ? column.render(row) : row[column.key];
  if (column.semantic) {
    const numeric = Number(value);
    const semanticClass = numeric > 0 ? 'font-semibold text-fin-profit' : numeric < 0 ? 'font-semibold text-fin-loss' : 'text-text-secondary';
    return <span className={semanticClass}>{value}</span>;
  }
  return value ?? '';
}

const ALIGN_CLASSES = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export function DataTable({ columns, data = [], onRowClick = null, emptyState = null, loading = false, skeletonRows = 5, className = '' }) {
  const [sort, setSort] = useState(null);
  const sortedData = useMemo(() => {
    if (!sort) return data;
    const column = columns.find((item) => item.key === sort.key);
    if (!column) return data;

    return [...data].sort((left, right) => {
      const result = compareValues(left[column.key], right[column.key]);
      return sort.direction === 'asc' ? result : -result;
    });
  }, [columns, data, sort]);

  const activateRow = (row) => {
    if (onRowClick) onRowClick(row);
  };

  if (loading) {
    return <Skeleton variant="table" rows={skeletonRows} columns={columns.length} />;
  }

  if (!sortedData.length) {
    return (
      <EmptyState
        title={emptyState?.title || 'No data'}
        description={emptyState?.description}
        action={emptyState?.action}
        onAction={emptyState?.onAction}
      />
    );
  }

  return (
    <div className={cn('w-full overflow-x-auto rounded-xl border border-border bg-surface', className)}>
      <table className="w-full text-left text-xs border-collapse">
        <thead className="border-b border-border bg-panel-solid font-medium text-text-secondary">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn('p-3.5 font-semibold uppercase tracking-wider text-[0.68rem]', ALIGN_CLASSES[column.align] || ALIGN_CLASSES.left)}
              >
                {column.sortable ? (
                  <button
                    className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                    type="button"
                    onClick={() =>
                      setSort((current) => ({
                        key: column.key,
                        direction: current?.key === column.key && current.direction === 'asc' ? 'desc' : 'asc',
                      }))
                    }
                  >
                    {column.label}
                  </button>
                ) : (
                  column.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sortedData.map((row, rowIndex) => (
            <tr
              key={row.id || row.ticker || rowIndex}
              tabIndex={onRowClick ? 0 : undefined}
              className={cn('transition-colors hover:bg-surface-hover', onRowClick && 'cursor-pointer focus:bg-surface-hover focus:outline-none')}
              onClick={() => activateRow(row)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  activateRow(row);
                }
              }}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn('p-3.5 text-foreground', column.mono && 'font-mono tabular-nums', ALIGN_CLASSES[column.align] || ALIGN_CLASSES.left)}
                >
                  {renderCellValue(column, row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
