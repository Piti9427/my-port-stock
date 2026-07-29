import PropTypes from 'prop-types';
import { useId } from 'react';
import { NumberField, SliderField, ToggleField } from './ConfigFields.jsx';
import { usePreferences } from '../../hooks/usePreferences';
import { useTranslation } from '../../i18n/useTranslation.js';

function SectionFrame({ title, description, children, dirty, onSave }) {
  const headingId = useId();

  return (
    <section className="flex min-w-0 flex-col" aria-labelledby={headingId}>
      <div className="mb-6 [&_h2]:text-xl [&_h2]:font-semibold [&_p]:mt-1 [&_p]:text-sm [&_p]:text-text-secondary">
        <h2 id={headingId}>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="flex flex-col gap-6">{children}</div>
      <div className="[display:flex] [align-items:center] [gap:12px] [margin-top:28px] [padding-top:20px] [border-top:1px_solid_var(--border-subtle)]">
        <button
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border border-transparent bg-brand px-5 py-3 font-sans text-sm font-bold tracking-wide text-text-inverse transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-hover disabled:text-text-secondary"
          onClick={onSave}
          disabled={!dirty}
          aria-label={`Save ${title}`}
        >
          Save {title}
        </button>
        {dirty && (
          <span className="[background:rgba(var(--status-warning-rgb),_0.15)] [color:var(--fin-warning)] [font-size:0.7rem] [font-weight:700] [padding:2px_6px] [border-radius:4px] [display:flex] [align-items:center] [gap:4px] [text-transform:uppercase] [letter-spacing:0.05em] [margin-left:auto]">
            Unsaved
          </span>
        )}
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
  const { t } = useTranslation();

  return (
    <SectionFrame title={t('config.general_settings')} description={t('config.general_description')} dirty={dirty} onSave={onSave}>
      <div className="flex flex-col">
        <label className="[font-size:0.95rem] [font-weight:600] [color:var(--text-primary)]" htmlFor="currency">
          {t('config.display_currency')}
        </label>
        <p className="[font-size:0.85rem] [color:var(--text-secondary)] [line-height:1.5] [margin-bottom:16px] [max-width:65ch]">
          {t('config.display_currency_description')}
        </p>
        <select
          id="currency"
          className="min-h-10 w-full rounded-sm border border-border bg-panel-solid px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-text-muted focus:border-brand focus:ring-2 focus:ring-brand"
          value={config.currency}
          onChange={(event) => update('currency')(event.target.value)}
        >
          <option value="THB">THB</option>
          <option value="USD">USD</option>
        </select>
      </div>
      <div className="flex flex-col">
        <label className="[font-size:0.95rem] [font-weight:600] [color:var(--text-primary)]" htmlFor="density">
          {t('config.interface_density')}
        </label>
        <p className="[font-size:0.85rem] [color:var(--text-secondary)] [line-height:1.5] [margin-bottom:16px] [max-width:65ch]">
          {t('config.interface_density_description')}
        </p>
        <select
          id="density"
          className="min-h-10 w-full rounded-sm border border-border bg-panel-solid px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-text-muted focus:border-brand focus:ring-2 focus:ring-brand"
          value={config.density}
          onChange={(event) => update('density')(event.target.value)}
        >
          <option value="comfortable">{t('config.density_comfortable')}</option>
          <option value="compact">{t('config.density_compact')}</option>
        </select>
      </div>
      <div className="flex flex-col">
        <label className="[font-size:0.95rem] [font-weight:600] [color:var(--text-primary)]" htmlFor="theme">
          {t('config.visual_theme')}
        </label>
        <p className="[font-size:0.85rem] [color:var(--text-secondary)] [line-height:1.5] [margin-bottom:16px] [max-width:65ch]">
          {t('config.visual_theme_description')}
        </p>
        <select
          id="theme"
          className="min-h-10 w-full rounded-sm border border-border bg-panel-solid px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-text-muted focus:border-brand focus:ring-2 focus:ring-brand"
          value={preferences.theme || 'light'}
          onChange={(event) => savePreferences({ theme: event.target.value })}
        >
          <option value="light">{t('config.theme_light')}</option>
          <option value="dark">{t('config.theme_dark')}</option>
          <option value="system">{t('config.theme_system')}</option>
        </select>
      </div>
      <div className="flex flex-col">
        <label className="[font-size:0.95rem] [font-weight:600] [color:var(--text-primary)]" htmlFor="language">
          {t('config.language_heading')}
        </label>
        <p className="[font-size:0.85rem] [color:var(--text-secondary)] [line-height:1.5] [margin-bottom:16px] [max-width:65ch]">
          {t('config.language_description')}
        </p>
        <select
          id="language"
          className="min-h-10 w-full rounded-sm border border-border bg-panel-solid px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-text-muted focus:border-brand focus:ring-2 focus:ring-brand"
          value={preferences.language || 'th'}
          onChange={(event) => savePreferences({ language: event.target.value })}
          aria-label="Language selection"
        >
          <option value="th">{t('config.lang_th')}</option>
          <option value="en">{t('config.lang_en')}</option>
        </select>
      </div>
      <div className="flex flex-col">
        <span className="[font-size:0.95rem] [font-weight:600] [color:var(--text-primary)]">{t('config.preferred_modes')}</span>
        <p className="[font-size:0.85rem] [color:var(--text-secondary)] [line-height:1.5] [margin-bottom:16px] [max-width:65ch]">
          {t('config.preferred_modes_description')}
        </p>
        <div className="flex flex-wrap gap-2">
          {['Quick Trade', 'Swing Trade', 'Long-Term/Core', 'Exit Review'].map((mode) => (
            <button
              key={mode}
              className="whitespace-nowrap rounded-sm border border-border bg-transparent px-3 py-[5px] text-xs tracking-[0.05em] text-text-secondary transition-colors hover:border-border-medium hover:text-foreground data-[active=true]:border-brand data-[active=true]:bg-brand-dim data-[active=true]:text-brand"
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
      <div className="flex flex-col">
        <label className="[font-size:0.95rem] [font-weight:600] [color:var(--text-primary)]" htmlFor="geminiModel">
          Gemini model
        </label>
        <p className="[font-size:0.85rem] [color:var(--text-secondary)] [line-height:1.5] [margin-bottom:16px] [max-width:65ch]">
          Model preference for local AI calls.
        </p>
        <select
          id="geminiModel"
          className="min-h-10 w-full rounded-sm border border-border bg-panel-solid px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-text-muted focus:border-brand focus:ring-2 focus:ring-brand"
          value={config.geminiModel}
          onChange={(event) => update('geminiModel')(event.target.value)}
        >
          <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
          <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
          <option value="gemini-2.0-pro">Gemini 2.0 Pro</option>
        </select>
      </div>
      <div className="flex flex-col">
        <label className="[font-size:0.95rem] [font-weight:600] [color:var(--text-primary)]" htmlFor="apiKey">
          Gemini API key
        </label>
        <p className="[font-size:0.85rem] [color:var(--text-secondary)] [line-height:1.5] [margin-bottom:16px] [max-width:65ch]">
          Masked in UI. Saving marks this section clean but excludes the key from persistent browser storage.
        </p>
        <input
          id="apiKey"
          aria-label="Gemini API key"
          type="password"
          className="min-h-10 w-full rounded-sm border border-border bg-panel-solid px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-text-muted focus:border-brand focus:ring-2 focus:ring-brand"
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
      <div className="grid gap-3 rounded-md border border-border-subtle bg-panel-solid p-4">
        <div className="text-xs font-bold uppercase tracking-wide text-text-secondary">Storage scope</div>
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
          <span className="size-2 shrink-0 rounded-full bg-brand transition-colors" />
          <span>Preferences</span>
          <span className="[color:var(--text-secondary)] [font-size:0.78rem]">Browser localStorage</span>
        </div>
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
          <span className="size-2 shrink-0 rounded-full bg-fin-profit transition-colors" />
          <span>Portfolio / Journal</span>
          <span className="[color:var(--text-secondary)] [font-size:0.78rem]">Supabase runtime tables</span>
        </div>
      </div>
      <button
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border border-border-subtle bg-transparent px-5 py-2.5 font-sans text-sm font-semibold text-text-secondary transition-colors hover:border-border-hover hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:text-text-muted"
        onClick={onReset}
      >
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
