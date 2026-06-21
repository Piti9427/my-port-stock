import { DataStamp } from './DataStamp.jsx';

function sparklinePoints(data) {
  if (!Array.isArray(data) || data.length < 2) return '';
  const values = data.map(Number).filter(Number.isFinite);
  if (values.length < 2) return '';

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 28 - ((value - min) / range) * 24;
      return `${x},${y}`;
    })
    .join(' ');
}

export function MetricCard({ label, value, change, changeType = 'neutral', sparklineData, dataStamp, mono = false }) {
  const points = sparklinePoints(sparklineData);

  return (
    <article className="metric-card">
      <div className="metric-card-header">
        <span className="metric-card-label">{label}</span>
        {change && <span className={`metric-card-change metric-card-change-${changeType}`}>{change}</span>}
      </div>
      <div className={`metric-card-value ${mono ? 'metric-card-value-mono' : ''}`}>{value}</div>
      {points && (
        <svg className="metric-card-sparkline" viewBox="0 0 100 32" aria-hidden="true">
          <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
      )}
      {dataStamp && <DataStamp source={dataStamp} />}
    </article>
  );
}
