function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="ui-skeleton-table" aria-hidden="true">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div className="ui-skeleton-table-row" data-testid="table-skeleton-row" key={rowIndex}>
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <span className="ui-skeleton ui-skeleton-cell" key={columnIndex} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function Skeleton({ variant = 'text', rows, columns, width, height }) {
  if (variant === 'table') {
    return <TableSkeleton rows={rows} columns={columns} />;
  }

  return <span className={`ui-skeleton ui-skeleton-${variant}`} data-testid={`skeleton-${variant}`} style={{ width, height }} aria-hidden="true" />;
}
