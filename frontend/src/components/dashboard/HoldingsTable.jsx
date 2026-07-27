import { useMemo } from 'react';
import { formatCurrency } from '../../lib/format.js';
import { DataTable } from '../ui/DataTable.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';

function numberValue(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function semanticValue(value, ticker, { signed = false } = {}) {
  const numeric = Number.isFinite(Number(value)) ? Number(value) : 0;
  return (
    <span className={numeric > 0 ? 'semantic-positive' : numeric < 0 ? 'semantic-negative' : 'semantic-neutral'}>
      {formatCurrency(numeric, ticker, { signed })}
    </span>
  );
}

export function HoldingsTable({
  holdings = [],
  loading = false,
  status = 'OK',
  onOpenTicker = null,
  onPlan = null,
  onRetry = null,
  onFirstRunAction = null,
}) {
  const rows = useMemo(() => {
    const totalValue = holdings.reduce((sum, holding) => sum + numberValue(holding.shares) * numberValue(holding.price), 0);

    return holdings.map((holding) => {
      const shares = numberValue(holding.shares);
      const averageCost = numberValue(holding.avg_cost ?? holding.avgCost);
      const price = numberValue(holding.price);
      const value = shares * price;
      const pnl = value - shares * averageCost;
      return {
        ...holding,
        shares,
        avgCost: averageCost,
        price,
        value,
        pnl,
        pnlPct: averageCost > 0 ? ((price - averageCost) / averageCost) * 100 : 0,
        weight: totalValue > 0 ? (value / totalValue) * 100 : 0,
      };
    });
  }, [holdings]);

  const columns = useMemo(
    () => [
      { key: 'ticker', label: 'Ticker', mono: true, sortable: true },
      {
        key: 'shares',
        label: 'Shares',
        mono: true,
        align: 'right',
        sortable: true,
        render: (row) => row.shares.toLocaleString(undefined, { maximumFractionDigits: 4 }),
      },
      { key: 'avgCost', label: 'Avg Cost', mono: true, align: 'right', sortable: true, render: (row) => formatCurrency(row.avgCost, row.ticker) },
      { key: 'price', label: 'Current', mono: true, align: 'right', sortable: true, render: (row) => formatCurrency(row.price, row.ticker) },
      { key: 'value', label: 'Value', mono: true, align: 'right', sortable: true, render: (row) => formatCurrency(row.value, row.ticker) },
      { key: 'pnl', label: 'P/L', mono: true, align: 'right', sortable: true, render: (row) => semanticValue(row.pnl, row.ticker, { signed: true }) },
      {
        key: 'pnlPct',
        label: 'P/L %',
        mono: true,
        align: 'right',
        sortable: true,
        render: (row) => {
          const val = Number.isFinite(Number(row.pnlPct)) ? Number(row.pnlPct) : 0;
          return (
            <span className={val > 0 ? 'semantic-positive' : val < 0 ? 'semantic-negative' : 'semantic-neutral'}>
              {val >= 0 ? '+' : ''}
              {val.toFixed(2)}%
            </span>
          );
        },
      },
      { key: 'weight', label: 'Weight', mono: true, align: 'right', sortable: true, render: (row) => `${row.weight.toFixed(1)}%` },
      {
        key: 'plan',
        label: '',
        align: 'right',
        render: (row) => (
          <button
            className="btn-secondary holdings-plan-button"
            type="button"
            aria-label={`วางแผน ${row.ticker}`}
            onClick={(event) => {
              event.stopPropagation();
              onPlan?.(row.ticker);
            }}
          >
            วางแผน
          </button>
        ),
      },
    ],
    [onPlan]
  );

  if (['INSUFFICIENT_DATA', 'UNAUTHORIZED', 'ERROR'].includes(status)) {
    return (
      <section className="dashboard-holdings" aria-labelledby="dashboard-holdings-title">
        <h2 id="dashboard-holdings-title">Holdings</h2>
        <EmptyState
          title="Portfolio data unavailable"
          description="Supabase holdings could not be loaded for this account."
          action={onRetry ? { label: 'Retry', onClick: onRetry } : undefined}
        />
      </section>
    );
  }

  return (
    <section className="dashboard-holdings" aria-labelledby="dashboard-holdings-title">
      <div className="dashboard-section-heading">
        <div>
          <h2 id="dashboard-holdings-title">Holdings</h2>
          <p>Positions derived from the authenticated Supabase portfolio.</p>
        </div>
      </div>
      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        skeletonRows={5}
        onRowClick={onOpenTicker ? (row) => onOpenTicker(row.ticker) : undefined}
        emptyState={{
          title: 'เริ่มต้นโดยเพิ่มหุ้นในพอร์ต',
          description: 'No portfolio data yet. บันทึก trade แรกเพื่อให้ Supabase holdings สร้างสถานะจริง',
          action: onFirstRunAction ? { label: 'บันทึกเทรดครั้งแรก', onClick: onFirstRunAction } : undefined,
        }}
      />
    </section>
  );
}
