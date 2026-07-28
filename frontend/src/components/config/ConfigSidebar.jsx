import PropTypes from 'prop-types';
import { RotateCcw, Settings } from 'lucide-react';

export function ConfigSidebar({ sections, activeSection, dirtySections, onSelect, onReset }) {
  return (
    <aside className="config-sidenav">
      <div className="config-sidenav-header">
        <Settings size={18} aria-hidden="true" style={{ color: 'var(--brand-primary)' }} />
        <span>Settings</span>
      </div>
      <p className="config-sidenav-desc">Local preferences for display, risk gates, alerts, and data utilities.</p>

      <nav className="config-sections-nav" aria-label="Settings sections">
        {sections.map((section) => {
          const dirty = Boolean(dirtySections[section.id]);
          return (
            <button
              key={section.id}
              className={`config-section-btn ${activeSection === section.id ? 'active' : ''}`}
              onClick={() => onSelect(section.id)}
            >
              <span>{section.label}</span>
              {dirty && <span className="config-section-btn__badge">Unsaved</span>}
            </button>
          );
        })}
      </nav>

      <div className="config-sidenav-actions">
        <button className="btn-secondary" onClick={onReset}>
          <RotateCcw size={13} aria-hidden="true" style={{ display: 'inline', marginRight: 6 }} />
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
