import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PreferencesProvider } from '../src/preferences/PreferencesContext.jsx';
import { useTranslation } from '../src/i18n/useTranslation.js';
import { translations } from '../src/i18n/translations.js';
import { usePreferences } from '../src/hooks/usePreferences.js';

vi.mock('../src/auth/clerkAdapter', () => ({
  useAuth: () => ({
    getToken: async () => 'test_token',
    userId: 'user_123',
  }),
  isDevAuthBypassEnabled: () => true,
}));

vi.mock('../src/lib/api', () => ({
  fetchWithAuth: vi.fn().mockImplementation((path, getToken, options = {}) => {
    if (options.method === 'PUT') {
      return Promise.resolve(options.body);
    }
    return Promise.resolve({ language: 'th' });
  }),
}));

function flattenKeys(value, prefix = '') {
  return Object.entries(value).flatMap(([key, nestedValue]) => {
    const keyPath = prefix ? `${prefix}.${key}` : key;
    return nestedValue && typeof nestedValue === 'object' ? flattenKeys(nestedValue, keyPath) : [keyPath];
  });
}

describe('i18n system & financial terminology standards', () => {
  it('keeps Thai and English catalogs structurally aligned', () => {
    expect(flattenKeys(translations.en).sort()).toEqual(flattenKeys(translations.th).sort());
  });

  it('defaults to Thai language and provides accurate financial terminology', () => {
    const { result } = renderHook(() => useTranslation(), {
      wrapper: PreferencesProvider,
    });

    expect(result.current.language).toBe('th');
    expect(result.current.t('terms.stop_loss')).toBe('จุดตัดขาดทุน (Stop Loss)');
    expect(result.current.t('terms.risk_reward_ratio')).toBe('อัตราผลตอบแทนต่อความเสี่ยง (Risk/Reward Ratio)');
    expect(result.current.t('terms.unrealized_pl')).toBe('กำไร/ขาดทุนที่ยังไม่รับรู้ (Unrealized P/L)');
    expect(result.current.t('terms.conviction_score')).toBe('คะแนนความเชื่อมั่น (Conviction Score)');
  });

  it('switches to English and provides standard institutional terminology', async () => {
    const { result } = renderHook(
      () => ({
        i18n: useTranslation(),
        prefs: usePreferences(),
      }),
      { wrapper: PreferencesProvider }
    );

    await act(async () => {
      await result.current.prefs.savePreferences({ language: 'en' });
    });

    expect(result.current.i18n.language).toBe('en');
    expect(result.current.i18n.t('terms.stop_loss')).toBe('Stop Loss');
    expect(result.current.i18n.t('terms.risk_reward_ratio')).toBe('Risk/Reward Ratio');
    expect(result.current.i18n.t('terms.unrealized_pl')).toBe('Unrealized P/L');
    expect(result.current.i18n.t('nav.journal')).toBe('Trade Journal');
  });

  it('handles missing keys gracefully by returning keyPath', () => {
    const { result } = renderHook(() => useTranslation(), {
      wrapper: PreferencesProvider,
    });

    expect(result.current.t('non_existent.key')).toBe('non_existent.key');
  });
});
