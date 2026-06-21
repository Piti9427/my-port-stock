export function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function formatCurrency(value, currency = 'THB') {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(numeric);
}

export function formatDate(value) {
  if (!value || Number.isNaN(Date.parse(value))) return '—';
  return new Date(value).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function statusLabel(status) {
  const normalized = String(status || 'OPEN').toUpperCase();
  if (normalized === 'CLOSED') return 'Closed';
  if (normalized === 'STOPPED_OUT') return 'Stopped Out';
  return 'Active';
}
