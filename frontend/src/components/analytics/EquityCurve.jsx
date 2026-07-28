import PropTypes from 'prop-types';
import { EmptyState } from '../ui/EmptyState.jsx';
import { buildEquityPoints, formatMoney } from './analyticsCalculations.js';

function polylinePoints(points) {
  if (points.length < 2) return '';
  const values = points.map((point) => point.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const range = max - min || 1;

  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * 100;
      const y = 72 - ((point.value - min) / range) * 64;
      return `${x},${y}`;
    })
    .join(' ');
}

export function EquityCurve({ trades }) {
  const points = buildEquityPoints(trades);
  const currentValue = points.at(-1)?.value ?? 0;
  const line = polylinePoints(points);

  return (
    <section
      className="rounded-lg border border-border bg-panel shadow-none [display:flex] [flex-direction:column]"
      aria-labelledby="analytics-equity-title"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-6 py-4 max-[640px]:flex-col max-[640px]:items-start">
        <div>
          <h2 id="analytics-equity-title" className="mb-0.5 text-[0.95rem] font-semibold text-foreground">
            Equity Curve
          </h2>
          <p className="text-pretty [margin:0] [padding:var(--space-3)] [border:1px_solid_rgba(var(--status-warning-rgb),_0.36)] [color:var(--fin-warning)] [font-size:0.76rem] text-xs text-text-secondary">
            Cumulative P/L {formatMoney(currentValue, { sign: true })}
          </p>
        </div>
      </div>
      {line ? (
        <div className="[padding:8px_16px_16px]">
          <svg
            className="[width:100%] [min-height:220px] [height:auto] [display:block] [overflow:visible]"
            role="img"
            aria-label="Equity curve"
            viewBox="0 0 100 80"
            preserveAspectRatio="none"
          >
            <line x1="0" y1="72" x2="100" y2="72" className="[stroke:var(--border-subtle)] [stroke-width:1]" vectorEffect="non-scaling-stroke" />
            <polyline points={line} fill="none" className="[stroke:var(--fin-profit)] [stroke-width:2]" vectorEffect="non-scaling-stroke" />
            {points.map((point, index) => {
              const [cx, cy] = line.split(' ')[index].split(',');
              return (
                <circle
                  key={`${point.trade.id || point.trade.ticker}-${index}`}
                  className="[fill:var(--surface-raised)] [stroke:var(--fin-profit)] [stroke-width:2] [transition:r_0.15s_ease,_fill_0.15s_ease] hover:[r:7]"
                  cx={cx}
                  cy={cy}
                  r="3"
                />
              );
            })}
          </svg>
        </div>
      ) : (
        <EmptyState title="ยังไม่มีข้อมูลเพียงพอสำหรับกราฟ" description="ต้องมี closed trade อย่างน้อยสองรายการใน filter นี้" />
      )}
    </section>
  );
}

EquityCurve.propTypes = {
  trades: PropTypes.arrayOf(PropTypes.object).isRequired,
};
