import PropTypes from 'prop-types';
import { NumberField, SliderField, ToggleField } from './ConfigFields.jsx';
import { usePreferences } from '../../hooks/usePreferences';

function SectionFrame({ title, description, children, dirty, onSave }) {
  return (
    <section className="config-section-content" aria-labelledby={`config-${title}`}>
      <div className="config-section-title">
        <h2 id={`config-${title}`}>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="config-fields">{children}</div>
      <div className="config-section-actions">
        <button className="btn-analyze" onClick={onSave} disabled={!dirty} aria-label={`Save ${title}`}>
          Save {title}
        </button>
        {dirty && <span className="unsaved-badge">Unsaved</span>}
      </div>
    </section>
  );
}

SectionFrame.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  dirty: PropTypes.bool.isRequired,
  onSave: PropTypes.func.isRequired,
};

function GeneralSection({ config, update, dirty, onSave }) {
  const { preferences, savePreferences } = usePreferences();

  return (
    <SectionFrame title="General" description="Display preferences and common decision modes." dirty={dirty} onSave={onSave}>
      <div className="config-field">
        <label className="config-field-label" htmlFor="currency">
          Display currency
        </label>
        <p className="config-field-desc">Used for local UI labels only; execution math still needs verified source data.</p>
        <select id="currency" className="mode-select" value={config.currency} onChange={(event) => update('currency')(event.target.value)}>
          <option value="THB">THB</option>
          <option value="USD">USD</option>
        </select>
      </div>
      <div className="config-field">
        <label className="config-field-label" htmlFor="density">
          Interface density
        </label>
        <p className="config-field-desc">Keeps repeated workflows scannable without changing analysis behavior.</p>
        <select id="density" className="mode-select" value={config.density} onChange={(event) => update('density')(event.target.value)}>
          <option value="comfortable">Comfortable</option>
          <option value="compact">Compact</option>
        </select>
      </div>
      <div className="config-field">
        <label className="config-field-label" htmlFor="theme">
          Visual theme
        </label>
        <p className="config-field-desc">Choose between Light (default), Dark (terminal UI), or System theme.</p>
        <select
          id="theme"
          className="mode-select"
          value={preferences.theme || 'light'}
          onChange={(event) => savePreferences({ theme: event.target.value })}
        >
          <option value="light">Light Mode (Default)</option>
          <option value="dark">Dark Mode</option>
          <option value="system">System Mode</option>
        </select>
      </div>
      <div className="config-field">
        <span className="config-field-label">Preferred decision modes</span>
        <p className="config-field-desc">These only affect local display order.</p>
        <div className="mode-chips">
          {['Quick Trade', 'Swing Trade', 'Long-Term/Core', 'Exit Review'].map((mode) => (
            <button
              key={mode}
              className="filter-chip"
              data-active={config.preferredModes.includes(mode)}
              onClick={() =>
                update('preferredModes')(
                  config.preferredModes.includes(mode) ? config.preferredModes.filter((item) => item !== mode) : [...config.preferredModes, mode]
                )
              }
              aria-pressed={config.preferredModes.includes(mode)}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>
    </SectionFrame>
  );
}

function ApiSection({ config, update, dirty, onSave }) {
  return (
    <SectionFrame title="API Keys" description="Secrets remain browser-local and are never written to localStorage." dirty={dirty} onSave={onSave}>
      <div className="config-field">
        <label className="config-field-label" htmlFor="geminiModel">
          Gemini model
        </label>
        <p className="config-field-desc">Model preference for local AI calls.</p>
        <select id="geminiModel" className="mode-select" value={config.geminiModel} onChange={(event) => update('geminiModel')(event.target.value)}>
          <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
          <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
          <option value="gemini-2.0-pro">Gemini 2.0 Pro</option>
        </select>
      </div>
      <div className="config-field">
        <label className="config-field-label" htmlFor="apiKey">
          Gemini API key
        </label>
        <p className="config-field-desc">Masked in UI. Saving marks this section clean but excludes the key from persistent browser storage.</p>
        <input
          id="apiKey"
          aria-label="Gemini API key"
          type="password"
          className="form-input"
          value={config.apiKey}
          onChange={(event) => update('apiKey')(event.target.value)}
          autoComplete="off"
        />
      </div>
    </SectionFrame>
  );
}

function RiskSection({ config, update, dirty, onSave }) {
  return (
    <SectionFrame title="Risk Parameters" description="SOP gates that prevent false Buy/Add decisions." dirty={dirty} onSave={onSave}>
      <SliderField
        id="maxPositionPct"
        label="Max position size per stock"
        description="Caps maximum allocation in any single holding"
        value={config.maxPositionPct}
        min={1}
        max={25}
        onChange={update('maxPositionPct')}
        warn={15}
        danger={20}
      />
      <SliderField
        id="maxSectorPct"
        label="Max sector exposure"
        description="Limits exposure within the same sector"
        value={config.maxSectorPct}
        min={10}
        max={60}
        onChange={update('maxSectorPct')}
        warn={40}
        danger={50}
      />
      <SliderField
        id="maxSpeculativePct"
        label="Max speculative allocation"
        description="Limits low-conviction or speculative names"
        value={config.maxSpeculativePct}
        min={0}
        max={50}
        onChange={update('maxSpeculativePct')}
        warn={30}
        danger={40}
      />
      <NumberField
        id="hardRiskPerTrade"
        label="Max risk per trade (THB)"
        description="Maximum THB you are willing to lose from entry to stop on each trade"
        value={config.hardRiskPerTradeTHB}
        onChange={update('hardRiskPerTradeTHB')}
        prefix="฿"
      />
      <SliderField
        id="maxPortfolioDrawdownPct"
        label="Max portfolio drawdown"
        description="Drawdown gate for new buy decisions"
        value={config.maxPortfolioDrawdownPct}
        min={5}
        max={30}
        onChange={update('maxPortfolioDrawdownPct')}
        warn={20}
        danger={25}
      />
      <SliderField
        id="minRR"
        label="Minimum risk/reward"
        description="Below this threshold the verdict must be Wait"
        value={config.minRR}
        min={1}
        max={5}
        step={0.1}
        unit=":1"
        onChange={update('minRR')}
      />
      <SliderField
        id="minConvictionScore"
        label="Minimum conviction score for Buy gate"
        description="Buy/Add is blocked below this score"
        value={config.minConvictionScore}
        min={4}
        max={8}
        step={0.1}
        unit="/10"
        onChange={update('minConvictionScore')}
      />
    </SectionFrame>
  );
}

function NotificationsSection({ config, update, dirty, onSave }) {
  return (
    <SectionFrame
      title="Notifications"
      description="Local alert preferences. Delivery integrations are not changed by this UI slice."
      dirty={dirty}
      onSave={onSave}
    >
      <SliderField
        id="alertOnBreachPct"
        label="Early breach alert threshold"
        description="Alert when a position approaches a risk limit"
        value={config.alertOnBreachPct}
        min={60}
        max={99}
        onChange={update('alertOnBreachPct')}
        warn={90}
        danger={95}
      />
      <ToggleField
        label="LINE alerts"
        description="Local preference only until a delivery integration is configured."
        checked={config.lineAlerts}
        onChange={update('lineAlerts')}
      />
      <ToggleField
        label="Email alerts"
        description="Local preference only until a delivery integration is configured."
        checked={config.emailAlerts}
        onChange={update('emailAlerts')}
      />
    </SectionFrame>
  );
}

function DataSection({ dirty, onSave, onReset }) {
  return (
    <SectionFrame
      title="Data Management"
      description="Manage browser-local preferences. Runtime portfolio data remains in Supabase."
      dirty={dirty}
      onSave={onSave}
    >
      <div className="config-status-block">
        <div className="config-status-title">Storage scope</div>
        <div className="config-status-item">
          <span className="config-status-dot done" />
          <span>Preferences</span>
          <span className="config-status-meta">Browser localStorage</span>
        </div>
        <div className="config-status-item">
          <span className="config-status-dot active" />
          <span>Portfolio / Journal</span>
          <span className="config-status-meta">Supabase runtime tables</span>
        </div>
      </div>
      <button className="btn-secondary config-reset-button" onClick={onReset}>
        Reset local preferences
      </button>
    </SectionFrame>
  );
}

const commonSectionPropTypes = {
  config: PropTypes.object.isRequired,
  update: PropTypes.func.isRequired,
  dirty: PropTypes.bool.isRequired,
  onSave: PropTypes.func.isRequired,
};

GeneralSection.propTypes = commonSectionPropTypes;
ApiSection.propTypes = commonSectionPropTypes;
RiskSection.propTypes = commonSectionPropTypes;
NotificationsSection.propTypes = commonSectionPropTypes;

DataSection.propTypes = {
  dirty: PropTypes.bool.isRequired,
  onSave: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
};

const sectionComponents = {
  general: GeneralSection,
  api: ApiSection,
  risk: RiskSection,
  notifications: NotificationsSection,
  data: DataSection,
};

export function ConfigSectionContent({ section, config, update, dirty, onSave, onReset }) {
  const Section = sectionComponents[section.id] || GeneralSection;
  return <Section config={config} update={update} dirty={dirty} onSave={onSave} onReset={onReset} />;
}

ConfigSectionContent.propTypes = {
  section: PropTypes.shape({ id: PropTypes.string.isRequired }).isRequired,
  config: PropTypes.object.isRequired,
  update: PropTypes.func.isRequired,
  dirty: PropTypes.bool.isRequired,
  onSave: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
};
