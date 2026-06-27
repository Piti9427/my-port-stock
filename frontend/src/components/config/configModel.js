export const STORAGE_KEY = 'myportstock_config_v1';

export const DEFAULT_CONFIG = {
  currency: 'THB',
  density: 'comfortable',
  maxPositionPct: 10,
  maxSectorPct: 35,
  maxSpeculativePct: 20,
  hardRiskPerTradeTHB: 25000,
  maxPortfolioDrawdownPct: 15,
  minRR: 2,
  minConvictionScore: 5,
  alertOnBreachPct: 85,
  preferredModes: ['Swing Trade', 'Long-Term/Core'],
  apiKey: '',
  geminiModel: 'gemini-2.5-pro',
  lineAlerts: false,
  emailAlerts: false,
};

export const SECTIONS = [
  { id: 'general', label: 'General', description: 'Display preferences and default decision modes.' },
  { id: 'api', label: 'API Keys', description: 'Local-only AI provider configuration.' },
  { id: 'risk', label: 'Risk Parameters', description: 'SOP limits that block unsafe Buy/Add decisions.' },
  { id: 'notifications', label: 'Notifications', description: 'Alert thresholds and channel preferences.' },
  { id: 'data', label: 'Data Management', description: 'Browser-local configuration backup and reset controls.' },
];

export const SECTION_KEYS = {
  general: ['currency', 'density', 'preferredModes'],
  api: ['apiKey', 'geminiModel'],
  risk: ['maxPositionPct', 'maxSectorPct', 'maxSpeculativePct', 'hardRiskPerTradeTHB', 'maxPortfolioDrawdownPct', 'minRR', 'minConvictionScore'],
  notifications: ['alertOnBreachPct', 'lineAlerts', 'emailAlerts'],
  data: [],
};

export function loadStoredConfig() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...DEFAULT_CONFIG, ...JSON.parse(stored), apiKey: '' } : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function getConfigForStorage(config) {
  const safeConfig = { ...config };
  delete safeConfig.apiKey;
  return safeConfig;
}

export function isSectionDirty(sectionId, config, savedConfig) {
  return (SECTION_KEYS[sectionId] || []).some((key) => JSON.stringify(config[key]) !== JSON.stringify(savedConfig[key]));
}

export function saveSection(sectionId, config, savedConfig) {
  const nextSaved = { ...savedConfig };
  for (const key of SECTION_KEYS[sectionId] || []) {
    nextSaved[key] = config[key];
  }
  return nextSaved;
}
