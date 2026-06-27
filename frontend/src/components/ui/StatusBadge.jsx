const STATUS_LABELS = {
  buy: 'Buy',
  hold: 'Hold',
  avoid: 'Avoid',
  wait: 'Wait',
  open: 'Open',
  closed: 'Closed',
  insufficient_data: 'Insufficient data',
};

export function StatusBadge({ status = 'wait', label }) {
  const normalizedStatus = String(status).trim().toLowerCase().replace(/\s+/g, '_');
  const displayLabel = label || STATUS_LABELS[normalizedStatus] || normalizedStatus.replace(/_/g, ' ');

  return <span className={`status-badge status-badge-${normalizedStatus}`}>{displayLabel}</span>;
}
