function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="ui-data-table-wrap" aria-hidden="true" data-testid="table-skeleton">
      <table className="ui-data-table">
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <th key={colIndex}>
                <span className="ui-skeleton" style={{ height: '14px', width: '60px', display: 'block' }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} data-testid="table-skeleton-row">
              {Array.from({ length: columns }).map((__, colIndex) => (
                <td key={colIndex}>
                  <span className="ui-skeleton" style={{ height: '16px', width: '80%', display: 'block' }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Skeleton({ variant = 'text', rows, columns, width, height }) {
  if (variant === 'table') {
    return <TableSkeleton rows={rows} columns={columns} />;
  }

  return <span className={`ui-skeleton ui-skeleton-${variant}`} data-testid={`skeleton-${variant}`} style={{ width, height }} aria-hidden="true" />;
}
