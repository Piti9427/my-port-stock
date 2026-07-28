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
    <div className={cn('w-full overflow-x-auto border border-[#262626] rounded-xl bg-[#121212] shadow-sm', className)}>
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-[#18181b] border-b border-[#262626] text-[#a1a1aa] font-medium">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="p-3.5 font-semibold uppercase tracking-wider text-[0.68rem]" style={{ textAlign: column.align || 'left' }}>
                {column.sortable ? (
                  <button
                    className="inline-flex items-center gap-1 hover:text-[#ededed] transition-colors"
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
        <tbody className="divide-y divide-[#262626]/60">
          {sortedData.map((row, rowIndex) => (
            <tr
              key={row.id || row.ticker || rowIndex}
              tabIndex={onRowClick ? 0 : undefined}
              className={cn('transition-colors hover:bg-[#18181b]/80', onRowClick && 'cursor-pointer focus:bg-[#18181b] focus:outline-none')}
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
                  className={cn('p-3.5 text-[#ededed]', column.mono && 'font-mono tabular-nums')}
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
