import { useMemo, useState } from 'react';
import {
  DEFAULT_CONFIG,
  SECTIONS,
  STORAGE_KEY,
  ConfigSectionContent,
  ConfigSidebar,
  getConfigForStorage,
  isSectionDirty,
  loadStoredConfig,
  saveSection,
} from '../components/config/';

export default function ConfigPage() {
  const [config, setConfig] = useState(loadStoredConfig);
  const [savedConfig, setSavedConfig] = useState(loadStoredConfig);
  const [activeSectionId, setActiveSectionId] = useState('general');

  const activeSection = SECTIONS.find((section) => section.id === activeSectionId) || SECTIONS[0];
  const dirtySections = useMemo(
    () => Object.fromEntries(SECTIONS.map((section) => [section.id, isSectionDirty(section.id, config, savedConfig)])),
    [config, savedConfig]
  );

  const update = (key) => (value) => {
    setConfig((current) => ({ ...current, [key]: value }));
  };

  const persist = (nextSavedConfig) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getConfigForStorage(nextSavedConfig)));
  };

  const handleSaveActiveSection = () => {
    const nextSavedConfig = saveSection(activeSection.id, config, savedConfig);
    setSavedConfig(nextSavedConfig);
    persist(nextSavedConfig);
  };

  const handleReset = () => {
    if (!globalThis.confirm('Reset local preferences? This does not change Supabase runtime data.')) return;
    setConfig(DEFAULT_CONFIG);
    setSavedConfig(DEFAULT_CONFIG);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <div className="[flex:1_1_auto] [min-height:0] [overflow-y:auto] [display:grid] [grid-template-columns:280px_1fr] max-[960px]:[grid-template-columns:1fr] max-[768px]:![overflow-y:visible] max-[768px]:![height:auto] max-[768px]:![min-height:0] max-[768px]:[min-width:0] max-[768px]:[height:auto] max-[768px]:[overflow-y:visible]">
      <ConfigSidebar
        sections={SECTIONS}
        activeSection={activeSection.id}
        dirtySections={dirtySections}
        onSelect={setActiveSectionId}
        onReset={handleReset}
      />
      <section className="[padding:48px] [max-width:800px] [width:100%] max-[960px]:[padding:20px] max-[768px]:[min-width:0] max-[768px]:[padding:var(--space-4)]">
        <ConfigSectionContent
          section={activeSection}
          config={config}
          update={update}
          dirty={Boolean(dirtySections[activeSection.id])}
          onSave={handleSaveActiveSection}
          onReset={handleReset}
        />
      </section>
    </div>
  );
}
