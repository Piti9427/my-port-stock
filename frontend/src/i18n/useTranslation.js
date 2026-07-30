// frontend/src/i18n/useTranslation.js
import { useContext } from 'react';
import { PreferencesContext } from '../preferences/PreferencesContext';
import { translations } from './translations';

export function translate(language, keyPath, params = {}) {
  const locale = translations[language] ? language : 'th';
  const keys = String(keyPath).split('.');
  let result = translations[locale];

  for (const key of keys) {
    if (!result || typeof result !== 'object' || !(key in result)) {
      return keyPath;
    }
    result = result[key];
  }

  if (typeof result !== 'string') return keyPath;

  return result.replace(/\{(\w+)\}/g, (_, name) => (params[name] !== undefined ? String(params[name]) : `{${name}}`));
}

export function useTranslation() {
  const context = useContext(PreferencesContext);
  const language = context?.preferences?.language || 'th';

  const t = (keyPath, params = {}) => translate(language, keyPath, params);

  return { t, language };
}
