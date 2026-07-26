// frontend/tests/onboardingPreferences.test.jsx
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { PreferencesProvider } from '../src/preferences/PreferencesContext';
import OnboardingPage from '../src/pages/OnboardingPage';
import { usePreferences } from '../src/hooks/usePreferences';
import * as api from '../src/lib/api';

vi.mock('../src/auth/clerkAdapter', () => ({
  useAuth: () => ({
    userId: 'user_123',
    getToken: async () => 'test_token',
  }),
}));

describe('Onboarding and Preferences Provider Flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.documentElement.removeAttribute('data-theme');
  });

  test('PreferencesProvider applies data-theme attribute on load', async () => {
    const fetchSpy = vi.spyOn(api, 'fetchWithAuth').mockResolvedValue({
      reporting_currency: 'USD',
      disclosure_level: 'advanced',
      theme: 'dark',
      onboarding_completed_at: '2026-07-03T00:00:00.000Z',
    });

    await act(async () => {
      render(
        <PreferencesProvider>
          <div />
        </PreferencesProvider>
      );
    });

    expect(fetchSpy).toHaveBeenCalledWith('/api/preferences', expect.any(Function));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  test('OnboardingPage renders choices and saves selections', async () => {
    const fetchSpy = vi.spyOn(api, 'fetchWithAuth');
    fetchSpy.mockResolvedValueOnce({
      reporting_currency: 'THB',
      disclosure_level: 'beginner',
      theme: 'light',
      onboarding_completed_at: null,
    });

    const TestComponent = () => {
      const { preferences } = usePreferences();
      return (
        <div>
          <span data-testid="completed">{String(preferences.onboarding_completed)}</span>
          <OnboardingPage />
        </div>
      );
    };

    await act(async () => {
      render(
        <PreferencesProvider>
          <TestComponent />
        </PreferencesProvider>
      );
    });

    expect(screen.getByTestId('completed').textContent).toBe('false');

    // Default choices: THB, beginner, light should be active
    const thbBtn = screen.getByRole('button', { name: /THB/ });
    const usdBtn = screen.getByRole('button', { name: /USD/ });
    expect(thbBtn).toHaveClass('active');
    expect(usdBtn).not.toHaveClass('active');

    // Click USD and Advanced and Dark mode
    fireEvent.click(usdBtn);
    fireEvent.click(screen.getByRole('button', { name: /Advanced/ }));
    fireEvent.click(screen.getByRole('button', { name: /Dark Mode/ }));

    // Mock successful save
    fetchSpy.mockResolvedValueOnce({
      reporting_currency: 'USD',
      disclosure_level: 'advanced',
      theme: 'dark',
      onboarding_completed_at: '2026-07-03T00:00:00.000Z',
    });

    const submitBtn = screen.getByRole('button', { name: /บันทึกและเริ่มต้นใช้งาน/ });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(fetchSpy).toHaveBeenLastCalledWith(
      '/api/preferences',
      expect.any(Function),
      expect.objectContaining({
        method: 'PUT',
        body: {
          reporting_currency: 'USD',
          disclosure_level: 'advanced',
          theme: 'dark',
        },
      })
    );

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
