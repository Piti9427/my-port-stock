import { useMemo } from 'react';
import { DataTable } from '../ui/DataTable.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';

function numberValue(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function money(value) {
  return `฿${numberValue(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function semanticValue(value, formatter = money) {
  const numeric = numberValue(value);
  return <span className={numeric > 0 ? 'semantic-positive' : numeric < 0 ? 'semantic-negative' : 'semantic-neutral'}>{formatter(numeric)}</span>;
}

export function HoldingsTable({ holdings = [], loading = false, status = 'OK', onOpenTicker, onPlan, onRetry, onFirstRunAction }) {
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
        pnl,
        pnlPct: averageCost > 0 ? ((price - averageCost) / averageCost) * 100 : 0,
        weight: totalValue > 0 ? (value / totalValue) * 100 : 0,
      };
    });
  }, [holdings]);

  const columns = useMemo(
    () => [
      { key: 'ticker', label: 'Ticker', mono: true, sortable: true },
      { key: 'shares', label: 'Shares', mono: true, align: 'right', sortable: true },
      { key: 'avgCost', label: 'Avg Cost', mono: true, align: 'right', sortable: true, render: (row) => money(row.avgCost) },
      { key: 'price', label: 'Current', mono: true, align: 'right', sortable: true, render: (row) => money(row.price) },
      { key: 'pnl', label: 'P/L', mono: true, align: 'right', sortable: true, render: (row) => semanticValue(row.pnl) },
      {
        key: 'pnlPct',
        label: 'P/L %',
        mono: true,
        align: 'right',
        sortable: true,
        render: (row) => semanticValue(row.pnlPct, (value) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`),
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
