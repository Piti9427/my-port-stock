import PropTypes from 'prop-types';
import { cn } from '../../lib/utils.js';

function sliderTrackColor(isDanger, isWarn) {
  if (isDanger) return 'var(--fin-loss)';
  if (isWarn) return 'var(--fin-warning)';
  return 'var(--brand-primary)';
}

function fieldValueClass(isDanger, isWarn) {
  if (isDanger) return 'text-fin-loss';
  if (isWarn) return 'text-fin-warning';
  return 'text-foreground';
}

export function SliderField({ id, label, description, value, min, max, step = 1, unit = '%', onChange, warn = undefined, danger = undefined }) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const isWarn = warn !== undefined && value >= warn;
  const isDanger = danger !== undefined && value >= danger;
  const trackColor = sliderTrackColor(isDanger, isWarn);

  return (
    <div className="flex flex-col">
      <div className="[display:flex] [justify-content:space-between] [align-items:flex-end] [margin-bottom:6px]">
        <label htmlFor={id} className="[font-size:0.95rem] [font-weight:600] [color:var(--text-primary)]">
          {label}
        </label>
        <span className={cn('mb-1 font-mono text-2xl font-bold leading-tight', fieldValueClass(isDanger, isWarn))}>
          {typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(1) : value}
          {unit}
        </span>
      </div>
      <p className="[font-size:0.85rem] [color:var(--text-secondary)] [line-height:1.5] [margin-bottom:16px] [max-width:65ch]">{description}</p>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="[-webkit-appearance:none] [width:100%] [height:6px] [background:var(--border-medium)] [border-radius:3px] [outline:none] [position:relative] before:[position:absolute] before:[top:0] before:[left:0] before:[bottom:0] before:[width:var(--fill-pct,_0%)] before:[background:var(--track-fill,_var(--brand-primary))] before:[border-radius:3px] before:[pointer-events:none] [&::-webkit-slider-thumb]:[-webkit-appearance:none] [&::-webkit-slider-thumb]:[appearance:none] [&::-webkit-slider-thumb]:[width:20px] [&::-webkit-slider-thumb]:[height:20px] [&::-webkit-slider-thumb]:[border-radius:50%] [&::-webkit-slider-thumb]:[background:var(--track-fill,_var(--brand-primary))] [&::-webkit-slider-thumb]:[cursor:pointer] [&::-webkit-slider-thumb]:[border:2px_solid_var(--text-inverse)] [&::-webkit-slider-thumb]:[transition:transform_0.1s] [&::-webkit-slider-thumb:hover]:[transform:scale(1.15)]"
        style={
          /** @type {import('react').CSSProperties & Record<`--${string}`, string>} */ ({
            '--track-fill': trackColor,
            '--fill-pct': `${pct}%`,
          })
        }
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value}${unit}`}
      />
      <div className="[display:flex] [justify-content:space-between] [margin-top:8px] [font-size:0.85rem] [color:var(--text-secondary)] font-sans">
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
    <div className="flex flex-col">
      <div className="[display:flex] [justify-content:space-between] [align-items:flex-end] [margin-bottom:6px]">
        <label htmlFor={id} className="[font-size:0.95rem] [font-weight:600] [color:var(--text-primary)]">
          {label}
        </label>
      </div>
      <p className="[font-size:0.85rem] [color:var(--text-secondary)] [line-height:1.5] [margin-bottom:16px] [max-width:65ch]">{description}</p>
      <div className="[display:flex] [align-items:center] [max-width:240px]">
        {prefix && (
          <span className="[background:rgba(var(--text-inverse-rgb),_0.05)] [border:1px_solid_var(--border-medium)] [color:var(--text-secondary)] [padding:10px_14px] [font-size:0.95rem] [border-right:none] [border-radius:var(--radius-xs)_0_0_var(--radius-xs)]">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type="number"
          className="min-h-10 w-full rounded-sm border border-border bg-panel-solid px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-text-muted focus:border-brand focus:ring-2 focus:ring-brand"
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {suffix && (
          <span className="[background:rgba(var(--text-inverse-rgb),_0.05)] [border:1px_solid_var(--border-medium)] [color:var(--text-secondary)] [padding:10px_14px] [font-size:0.95rem] [border-left:none] [border-radius:0_var(--radius-xs)_var(--radius-xs)_0]">
            {suffix}
          </span>
        )}
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
    <label className="[display:flex] [align-items:center] [justify-content:space-between] [gap:16px] [padding:12px_0] [border-bottom:1px_solid_var(--border-subtle)] [&_span]:[display:flex] [&_span]:[flex-direction:column] [&_span]:[gap:4px] [&_small]:[color:var(--text-secondary)] [&_small]:[font-size:0.78rem]">
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
