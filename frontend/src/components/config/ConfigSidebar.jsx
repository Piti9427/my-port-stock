import PropTypes from 'prop-types';
import { RotateCcw, Settings } from 'lucide-react';
import { cn } from '../../lib/utils.js';

export function ConfigSidebar({ sections, activeSection, dirtySections, onSelect, onReset }) {
  return (
    <aside className="[flex-shrink:0] [background:var(--bg-panel)] [padding:32px_24px] [display:flex] [flex-direction:column] max-[960px]:[border-right:none] max-[960px]:[border-bottom:1px_solid_var(--border-subtle)] max-[960px]:[flex-direction:row] max-[960px]:[flex-wrap:wrap] max-[960px]:[padding:16px] max-[768px]:[width:100%] max-[768px]:[min-width:0] max-[768px]:[align-items:stretch] max-[768px]:[flex-direction:column] max-[768px]:[flex-wrap:nowrap] max-[768px]:[padding:var(--space-4)_var(--space-4)_var(--space-2)]">
      <div className="[display:flex] [align-items:center] [gap:10px] [font-size:1.1rem] [font-weight:600] [margin-bottom:12px]">
        <Settings size={18} aria-hidden="true" className="text-brand" />
        <span>Settings</span>
      </div>
      <p className="[font-size:0.85rem] [color:var(--text-secondary)] [line-height:1.5] [margin-bottom:32px] max-[960px]:[display:none] max-[768px]:[margin-bottom:var(--space-4)]">
        Local preferences for display, risk gates, alerts, and data utilities.
      </p>

      <nav
        className="[display:flex] [flex-direction:column] [gap:4px] [flex:1] max-[960px]:[flex-direction:row] max-[960px]:[gap:4px] max-[768px]:[width:100%] max-[768px]:[min-width:0] max-[768px]:[flex-direction:row] max-[768px]:[overflow-x:auto] max-[768px]:[gap:8px] max-[768px]:[padding-bottom:8px] max-[768px]:[border-bottom:1px_solid_var(--border-subtle)]"
        aria-label="Settings sections"
      >
        {sections.map((section) => {
          const dirty = Boolean(dirtySections[section.id]);
          return (
            <button
              key={section.id}
              className={cn(
                'flex cursor-pointer items-center justify-between gap-2 rounded-sm border-0 bg-transparent px-4 py-2.5 text-left text-[0.95rem] font-medium text-text-secondary transition-colors hover:bg-panel-hover hover:text-foreground max-[768px]:shrink-0 max-[768px]:whitespace-nowrap max-[768px]:px-3 max-[768px]:py-1.5',
                activeSection === section.id && 'bg-fin-info-dim font-semibold text-brand'
              )}
              onClick={() => onSelect(section.id)}
            >
              <span>{section.label}</span>
              {dirty && <span className="rounded-full bg-brand-dim px-2 py-0.5 text-[0.62rem] font-bold uppercase text-brand">Unsaved</span>}
            </button>
          );
        })}
      </nav>

      <div className="[margin-top:32px] [padding-top:24px] [border-top:1px_solid_var(--border-subtle)] [display:flex] [flex-direction:column] [gap:12px] max-[960px]:[margin-top:0] max-[960px]:[flex-direction:row] max-[768px]:[width:100%]">
        <button
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border border-border-subtle bg-transparent px-5 py-2.5 font-sans text-sm font-semibold text-text-secondary transition-colors hover:border-border-hover hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:text-text-muted"
          onClick={onReset}
        >
          <RotateCcw size={13} aria-hidden="true" className="mr-1.5 inline" />
          Reset local preferences
        </button>
      </div>
    </aside>
  );
}

ConfigSidebar.propTypes = {
  sections: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ).isRequired,
  activeSection: PropTypes.string.isRequired,
  dirtySections: PropTypes.object.isRequired,
  onSelect: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
};
