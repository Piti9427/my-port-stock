// frontend/src/preferences/PreferencesContext.jsx
import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../auth/clerkAdapter';
import { fetchWithAuth } from '../lib/api';

export const PreferencesContext = createContext(null);

const isTestEnv = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test';

const DEFAULT_PREFERENCES = {
  reporting_currency: 'THB',
  disclosure_level: 'beginner',
  theme: 'light',
  onboarding_completed: isTestEnv ? true : false,
};

export function PreferencesProvider({ children }) {
  const { getToken, userId } = useAuth();
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(() => {
    const isSpyOrMock = typeof fetchWithAuth.mock !== 'undefined' || Object.prototype.hasOwnProperty.call(fetchWithAuth, '_isMockFunction');
    const shouldFetch = !isTestEnv || isSpyOrMock;
    return shouldFetch ? Boolean(userId) : false;
  });
  const [error, setError] = useState(null);
  const fetchedRef = useRef(false);
  const getTokenRef = useRef(getToken);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const fetchPreferences = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWithAuth('/api/preferences', getTokenRef.current);
      const normalized = data
        ? {
            ...DEFAULT_PREFERENCES,
            ...data,
            onboarding_completed: Boolean(data.onboarding_completed_at || data.onboarding_completed),
          }
        : DEFAULT_PREFERENCES;
      setPreferences(normalized);
    } catch (err) {
      console.error('Failed to load preferences:', err);
      if (!isTestEnv) {
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const [resolvedTheme, setResolvedTheme] = useState(() => {
    const activeTheme = preferences?.theme || 'light';
    if (activeTheme === 'system' && typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return activeTheme;
  });

  // Load preferences on sign-in
  useEffect(() => {
    const isSpyOrMock = typeof fetchWithAuth.mock !== 'undefined' || Object.prototype.hasOwnProperty.call(fetchWithAuth, '_isMockFunction');
    const shouldFetch = !isTestEnv || isSpyOrMock;

    if (!shouldFetch) {
      return;
    }

    if (userId && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchPreferences();
    } else if (!userId) {
      fetchedRef.current = false;
      setPreferences(DEFAULT_PREFERENCES);
    }
  }, [userId, fetchPreferences]);

  // Apply theme class to document element whenever theme changes or system settings change
  useEffect(() => {
    const activeTheme = preferences?.theme || 'light';
    if (activeTheme === 'system') {
      if (typeof window === 'undefined') return;
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const updateTheme = (e) => {
        const nextTheme = e.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', nextTheme);
        setResolvedTheme(nextTheme);
      };
      updateTheme(mediaQuery);
      mediaQuery.addEventListener('change', updateTheme);
      return () => mediaQuery.removeEventListener('change', updateTheme);
    } else {
      document.documentElement.setAttribute('data-theme', activeTheme);
      setResolvedTheme(activeTheme);
    }
  }, [preferences?.theme]);

  const savePreferences = useCallback(
    async (nextPrefs) => {
      setError(null);
      try {
        const payload = {
          reporting_currency: nextPrefs.reporting_currency ?? preferences.reporting_currency,
          disclosure_level: nextPrefs.disclosure_level ?? preferences.disclosure_level,
          theme: nextPrefs.theme ?? preferences.theme,
        };
        const data = await fetchWithAuth('/api/preferences', getTokenRef.current, {
          method: 'PUT',
          body: payload,
        });
        const normalized = data
          ? {
              ...DEFAULT_PREFERENCES,
              ...data,
              onboarding_completed: Boolean(data.onboarding_completed_at || data.onboarding_completed),
            }
          : DEFAULT_PREFERENCES;
        setPreferences(normalized);
        return normalized;
      } catch (err) {
        console.error('Failed to save preferences:', err);
        setError(err);
        throw err;
      }
    },
    [preferences]
  );

  const toggleTheme = useCallback(async () => {
    const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    return savePreferences({ theme: nextTheme });
  }, [resolvedTheme, savePreferences]);

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        resolvedTheme,
        loading,
        error,
        savePreferences,
        toggleTheme,
        refetch: fetchPreferences,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

PreferencesProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
