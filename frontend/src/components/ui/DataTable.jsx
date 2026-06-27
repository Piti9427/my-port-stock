import { useMemo, useState } from 'react';
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
    const semanticClass = numeric > 0 ? 'semantic-positive' : numeric < 0 ? 'semantic-negative' : 'semantic-neutral';
    return <span className={semanticClass}>{value}</span>;
  }
  return value ?? '';
}

export function DataTable({ columns, data = [], onRowClick, emptyState, loading = false, skeletonRows = 5 }) {
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
    <div className="ui-data-table-wrap">
      <table className="ui-data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} style={{ textAlign: column.align || 'left' }}>
                {column.sortable ? (
                  <button
                    className="ui-data-table-sort"
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
        <tbody>
          {sortedData.map((row, rowIndex) => (
            <tr
              key={row.id || row.ticker || rowIndex}
              tabIndex={onRowClick ? 0 : undefined}
              className={onRowClick ? 'ui-data-table-clickable-row' : undefined}
              onClick={() => activateRow(row)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  activateRow(row);
                }
              }}
            >
              {columns.map((column) => (
                <td key={column.key} className={column.mono ? 'mono-cell' : undefined} style={{ textAlign: column.align || 'left' }}>
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
