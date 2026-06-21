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
    <div className="config-page">
      <ConfigSidebar
        sections={SECTIONS}
        activeSection={activeSection.id}
        dirtySections={dirtySections}
        onSelect={setActiveSectionId}
        onReset={handleReset}
      />
      <section className="config-content">
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
