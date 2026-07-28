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
    const semanticClass = numeric > 0 ? 'text-emerald-400 font-semibold' : numeric < 0 ? 'text-rose-400 font-semibold' : 'text-neutral-400';
    return <span className={semanticClass}>{value}</span>;
  }
  return value ?? '';
}

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
    <div className={cn('w-full overflow-x-auto border border-neutral-800 rounded-lg bg-neutral-900/60 backdrop-blur-sm', className)}>
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-neutral-900/90 border-b border-neutral-800 text-neutral-400 font-medium">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="p-3 font-semibold uppercase tracking-wider text-[0.7rem]" style={{ textAlign: column.align || 'left' }}>
                {column.sortable ? (
                  <button
                    className="inline-flex items-center gap-1 hover:text-neutral-100 transition-colors"
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
        <tbody className="divide-y divide-neutral-800/60">
          {sortedData.map((row, rowIndex) => (
            <tr
              key={row.id || row.ticker || rowIndex}
              tabIndex={onRowClick ? 0 : undefined}
              className={cn('transition-colors', onRowClick && 'cursor-pointer hover:bg-neutral-800/50 focus:bg-neutral-800/50 focus:outline-none')}
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
                  className={cn('p-3 text-neutral-200', column.mono && 'font-mono tabular-nums')}
                  style={{ textAlign: column.align || 'left' }}
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
