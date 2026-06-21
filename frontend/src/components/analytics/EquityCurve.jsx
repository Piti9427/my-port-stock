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
    <section className="glass-panel analytics-equity-panel" aria-labelledby="analytics-equity-title">
      <div className="panel-header">
        <div>
          <h2 id="analytics-equity-title" className="panel-heading">
            Equity Curve
          </h2>
          <p className="panel-subtext">Cumulative P/L {formatMoney(currentValue, { sign: true })}</p>
        </div>
      </div>
      {line ? (
        <div className="equity-chart-wrap">
          <svg className="equity-svg" role="img" aria-label="Equity curve" viewBox="0 0 100 80" preserveAspectRatio="none">
            <line x1="0" y1="72" x2="100" y2="72" className="equity-axis" vectorEffect="non-scaling-stroke" />
            <polyline points={line} fill="none" className="equity-line" vectorEffect="non-scaling-stroke" />
            {points.map((point, index) => {
              const [cx, cy] = line.split(' ')[index].split(',');
              return <circle key={`${point.trade.id || point.trade.ticker}-${index}`} className="equity-dot" cx={cx} cy={cy} r="3" />;
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
