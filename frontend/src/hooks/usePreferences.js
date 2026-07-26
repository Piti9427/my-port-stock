// frontend/src/hooks/usePreferences.js
import { useContext } from 'react';
import { PreferencesContext } from '../preferences/PreferencesContext';

const FALLBACK_CONTEXT = {
  preferences: {
    reporting_currency: 'THB',
    disclosure_level: 'beginner',
    theme: 'dark', // Fallback to 'dark' for components rendered outside provider (e.g. tests)
    onboarding_completed: true,
  },
  loading: false,
  error: null,
  savePreferences: async () => {},
  toggleTheme: async () => {},
  refetch: async () => {},
};

export function usePreferences() {
  const context = useContext(PreferencesContext);
  return context || FALLBACK_CONTEXT;
}
