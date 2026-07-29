// frontend/src/pages/OnboardingPage.jsx
import { useEffect, useState } from 'react';
import { usePreferences } from '../hooks/usePreferences';
import { translate } from '../i18n/useTranslation';
import { Check, Coins, Eye, Monitor } from 'lucide-react';
import { cn } from '../lib/utils';

const optionClassName =
  'relative flex min-h-20 cursor-pointer items-center justify-between rounded-md border border-border bg-surface p-4 text-left text-foreground outline-none transition hover:-translate-y-px hover:border-border-hover hover:bg-surface-hover focus-visible:border-border-hover focus-visible:bg-surface-hover active:translate-y-0 active:scale-[0.99] motion-reduce:transform-none';

export default function OnboardingPage() {
  const { preferences, savePreferences } = usePreferences();
  const [language, setLanguage] = useState(preferences.language || 'th');
  const [currency, setCurrency] = useState('THB');
  const [disclosure, setDisclosure] = useState('beginner');
  const [theme, setTheme] = useState('light');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const t = (keyPath, params) => translate(language, keyPath, params);

  useEffect(() => {
    document.documentElement.setAttribute('lang', language);
  }, [language]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await savePreferences({
        reporting_currency: currency,
        disclosure_level: disclosure,
        theme,
        language,
      });
    } catch (err) {
      setError(err.message || t('onboarding.save_error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4">
      <main className="flex w-full max-w-[580px] flex-col gap-6 rounded-md border border-border bg-surface p-8" aria-labelledby="onboarding-title">
        <div className="flex justify-end">
          <button
            type="button"
            className="flex min-h-10 min-w-10 items-center justify-center rounded-sm border border-border bg-surface px-3 font-mono text-xs font-bold text-foreground hover:border-border-hover hover:bg-surface-hover"
            onClick={() => setLanguage((current) => (current === 'th' ? 'en' : 'th'))}
            aria-label={language === 'th' ? 'Switch to English' : 'Switch to Thai'}
            title={language === 'th' ? 'Switch to English' : 'Switch to Thai'}
          >
            {language.toUpperCase()}
          </button>
        </div>
        <header className="text-center">
          <h1 id="onboarding-title" className="mb-2 text-[1.6rem] font-bold text-foreground">
            {t('onboarding.title')}
          </h1>
          <p className="text-sm text-text-secondary">{t('onboarding.subtitle')}</p>
        </header>

        {error && (
          <div className="rounded-md border border-fin-loss bg-fin-loss-dim px-4 py-3 text-sm text-fin-loss" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* 1. Currency Selection */}
          <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
            <legend className="mb-1 flex items-center gap-2 text-sm font-bold text-foreground">
              <Coins size={16} aria-hidden="true" />
              <span>{t('onboarding.currency_heading')}</span>
            </legend>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
              <button
                type="button"
                className={cn(optionClassName, currency === 'THB' && 'border-brand bg-brand-dim')}
                onClick={() => setCurrency('THB')}
                aria-pressed={currency === 'THB'}
              >
                <div className="flex flex-col gap-1 pr-4">
                  <span className="text-sm font-bold text-foreground">THB (฿)</span>
                  <span className="text-xs leading-[1.3] text-text-secondary">{t('onboarding.thb_description')}</span>
                </div>
                {currency === 'THB' && <Check size={18} className="shrink-0 text-brand" />}
              </button>

              <button
                type="button"
                className={cn(optionClassName, currency === 'USD' && 'border-brand bg-brand-dim')}
                onClick={() => setCurrency('USD')}
                aria-pressed={currency === 'USD'}
              >
                <div className="flex flex-col gap-1 pr-4">
                  <span className="text-sm font-bold text-foreground">USD ($)</span>
                  <span className="text-xs leading-[1.3] text-text-secondary">{t('onboarding.usd_description')}</span>
                </div>
                {currency === 'USD' && <Check size={18} className="shrink-0 text-brand" />}
              </button>
            </div>
          </fieldset>

          {/* 2. Disclosure Level Selection */}
          <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
            <legend className="mb-1 flex items-center gap-2 text-sm font-bold text-foreground">
              <Eye size={16} aria-hidden="true" />
              <span>{t('onboarding.disclosure_heading')}</span>
            </legend>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
              <button
                type="button"
                className={cn(optionClassName, disclosure === 'beginner' && 'border-brand bg-brand-dim')}
                onClick={() => setDisclosure('beginner')}
                aria-pressed={disclosure === 'beginner'}
              >
                <div className="flex flex-col gap-1 pr-4">
                  <span className="text-sm font-bold text-foreground">Beginner</span>
                  <span className="text-xs leading-[1.3] text-text-secondary">{t('onboarding.beginner_description')}</span>
                </div>
                {disclosure === 'beginner' && <Check size={18} className="shrink-0 text-brand" />}
              </button>

              <button
                type="button"
                className={cn(optionClassName, disclosure === 'advanced' && 'border-brand bg-brand-dim')}
                onClick={() => setDisclosure('advanced')}
                aria-pressed={disclosure === 'advanced'}
              >
                <div className="flex flex-col gap-1 pr-4">
                  <span className="text-sm font-bold text-foreground">Advanced</span>
                  <span className="text-xs leading-[1.3] text-text-secondary">{t('onboarding.advanced_description')}</span>
                </div>
                {disclosure === 'advanced' && <Check size={18} className="shrink-0 text-brand" />}
              </button>
            </div>
          </fieldset>

          {/* 3. Theme Selection */}
          <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
            <legend className="mb-1 flex items-center gap-2 text-sm font-bold text-foreground">
              <Monitor size={16} aria-hidden="true" />
              <span>{t('onboarding.theme_heading')}</span>
            </legend>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
              <button
                type="button"
                className={cn(optionClassName, theme === 'light' && 'border-brand bg-brand-dim')}
                onClick={() => setTheme('light')}
                aria-pressed={theme === 'light'}
              >
                <div className="flex flex-col gap-1 pr-4">
                  <span className="text-sm font-bold text-foreground">{t('onboarding.light_label')}</span>
                  <span className="text-xs leading-[1.3] text-text-secondary">{t('onboarding.light_description')}</span>
                </div>
                {theme === 'light' && <Check size={18} className="shrink-0 text-brand" />}
              </button>

              <button
                type="button"
                className={cn(optionClassName, theme === 'dark' && 'border-brand bg-brand-dim')}
                onClick={() => setTheme('dark')}
                aria-pressed={theme === 'dark'}
              >
                <div className="flex flex-col gap-1 pr-4">
                  <span className="text-sm font-bold text-foreground">Dark Mode</span>
                  <span className="text-xs leading-[1.3] text-text-secondary">{t('onboarding.dark_description')}</span>
                </div>
                {theme === 'dark' && <Check size={18} className="shrink-0 text-brand" />}
              </button>

              <button
                type="button"
                className={cn(optionClassName, theme === 'system' && 'border-brand bg-brand-dim')}
                onClick={() => setTheme('system')}
                aria-pressed={theme === 'system'}
              >
                <div className="flex flex-col gap-1 pr-4">
                  <span className="text-sm font-bold text-foreground">System Mode</span>
                  <span className="text-xs leading-[1.3] text-text-secondary">{t('onboarding.system_description')}</span>
                </div>
                {theme === 'system' && <Check size={18} className="shrink-0 text-brand" />}
              </button>
            </div>
          </fieldset>

          <button
            type="submit"
            className="mt-2 min-h-12 rounded-md bg-brand px-4 py-3 text-base font-bold text-text-inverse transition hover:-translate-y-px active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none"
            disabled={saving}
          >
            {saving ? t('onboarding.saving') : t('onboarding.submit')}
          </button>
        </form>
      </main>
    </div>
  );
}
