import PropTypes from 'prop-types';
import { RotateCcw, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ConfigSidebar({ sections, activeSection, dirtySections, onSelect, onReset }) {
  return (
    <aside className="shrink-0 bg-neutral-900/60 p-6 md:p-8 flex flex-col border-b md:border-b-0 md:border-r border-neutral-800">
      <div className="flex items-center gap-2.5 text-lg font-bold mb-3 text-neutral-100">
        <Settings size={18} aria-hidden="true" className="text-emerald-400" />
        <span>Settings</span>
      </div>
      <p className="text-xs text-neutral-400 leading-relaxed mb-8">Local preferences for display, risk gates, alerts, and data utilities.</p>

      <nav className="flex flex-col gap-1 flex-1" aria-label="Settings sections">
        {sections.map((section) => {
          const dirty = Boolean(dirtySections[section.id]);
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              className={cn(
                'flex items-center justify-between gap-2 px-4 py-2.5 text-sm font-medium rounded-md transition-all text-left',
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20'
                  : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-200'
              )}
              onClick={() => onSelect(section.id)}
            >
              <span>{section.label}</span>
              {dirty && <span className="text-[0.72rem] font-bold text-amber-400 uppercase tracking-wider">Unsaved</span>}
            </button>
          );
        })}
      </nav>

      <div className="mt-8 pt-6 border-t border-neutral-800 flex flex-col gap-3">
        <button
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md border border-neutral-700 bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors"
          onClick={onReset}
        >
          <RotateCcw size={13} aria-hidden="true" />
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
