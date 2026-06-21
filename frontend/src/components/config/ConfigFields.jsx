import PropTypes from 'prop-types';

function sliderTrackColor(isDanger, isWarn) {
  if (isDanger) return 'var(--fin-loss)';
  if (isWarn) return 'var(--fin-warning)';
  return 'var(--brand-primary)';
}

function fieldValueColor(isDanger, isWarn) {
  if (isDanger) return 'var(--fin-loss)';
  if (isWarn) return 'var(--fin-warning)';
  return 'var(--text-primary)';
}

export function SliderField({ id, label, description, value, min, max, step = 1, unit = '%', onChange, warn, danger }) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const isWarn = warn !== undefined && value >= warn;
  const isDanger = danger !== undefined && value >= danger;
  const trackColor = sliderTrackColor(isDanger, isWarn);

  return (
    <div className="config-field">
      <div className="config-field-header">
        <label htmlFor={id} className="config-field-label">
          {label}
        </label>
        <span className="config-field-value" style={{ color: fieldValueColor(isDanger, isWarn) }}>
          {typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(1) : value}
          {unit}
        </span>
      </div>
      <p className="config-field-desc">{description}</p>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="config-slider"
        style={{ '--track-fill': trackColor, '--fill-pct': `${pct}%` }}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value}${unit}`}
      />
      <div className="config-slider-labels">
        <span>
          {min}
          {unit}
        </span>
        <span>
          {max}
          {unit}
        </span>
      </div>
    </div>
  );
}

SliderField.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  min: PropTypes.number.isRequired,
  max: PropTypes.number.isRequired,
  step: PropTypes.number,
  unit: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  warn: PropTypes.number,
  danger: PropTypes.number,
};

export function NumberField({ id, label, description, value, onChange, prefix = '', suffix = '' }) {
  return (
    <div className="config-field">
      <div className="config-field-header">
        <label htmlFor={id} className="config-field-label">
          {label}
        </label>
      </div>
      <p className="config-field-desc">{description}</p>
      <div className="config-input-wrap">
        {prefix && <span className="config-input-prefix">{prefix}</span>}
        <input id={id} type="number" className="form-input" value={value} onChange={(event) => onChange(Number(event.target.value))} />
        {suffix && <span className="config-input-suffix">{suffix}</span>}
      </div>
    </div>
  );
}

NumberField.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  onChange: PropTypes.func.isRequired,
  prefix: PropTypes.string,
  suffix: PropTypes.string,
};

export function ToggleField({ label, description, checked, onChange }) {
  return (
    <label className="config-toggle-row">
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

ToggleField.propTypes = {
  label: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};
