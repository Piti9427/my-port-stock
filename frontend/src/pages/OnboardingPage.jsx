// frontend/src/pages/OnboardingPage.jsx
import { useState } from 'react';
import { usePreferences } from '../hooks/usePreferences';
import { Check, Coins, Eye, Monitor } from 'lucide-react';
import { cn } from '../lib/utils';

const optionClassName =
  'relative flex min-h-20 cursor-pointer items-center justify-between rounded-md border border-border bg-surface p-4 text-left text-foreground outline-none transition hover:-translate-y-px hover:border-border-hover hover:bg-surface-hover focus-visible:border-border-hover focus-visible:bg-surface-hover active:translate-y-0 active:scale-[0.99] motion-reduce:transform-none';

export default function OnboardingPage() {
  const { savePreferences } = usePreferences();
  const [currency, setCurrency] = useState('THB');
  const [disclosure, setDisclosure] = useState('beginner');
  const [theme, setTheme] = useState('light');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

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
      });
    } catch (err) {
      setError(err.message || 'บันทึกการตั้งค่าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4">
      <main className="flex w-full max-w-[580px] flex-col gap-6 rounded-md border border-border bg-surface p-8" aria-labelledby="onboarding-title">
        <header className="text-center">
          <h1 id="onboarding-title" className="mb-2 text-[1.6rem] font-bold text-foreground">
            ยินดีต้อนรับสู่ MyPortStock
          </h1>
          <p className="text-sm text-text-secondary">กรุณาตั้งค่าเริ่มต้นสำหรับพอร์ตของคุณเพื่อเริ่มต้นใช้งาน</p>
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
              <span>สกุลเงินที่ใช้รายงานผล (Reporting Currency)</span>
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
                  <span className="text-xs leading-[1.3] text-text-secondary">แสดงมูลค่าพอร์ตและรายการเทรดเป็นเงินบาท</span>
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
                  <span className="text-xs leading-[1.3] text-text-secondary">แสดงมูลค่าพอร์ตและรายการเทรดเป็นดอลลาร์สหรัฐ</span>
                </div>
                {currency === 'USD' && <Check size={18} className="shrink-0 text-brand" />}
              </button>
            </div>
          </fieldset>

          {/* 2. Disclosure Level Selection */}
          <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
            <legend className="mb-1 flex items-center gap-2 text-sm font-bold text-foreground">
              <Eye size={16} aria-hidden="true" />
              <span>ระดับการเปิดเผยข้อมูล (Disclosure Level)</span>
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
                  <span className="text-xs leading-[1.3] text-text-secondary">ซ่อนผลคะแนน sub-agent และสรุป SWOT ไว้หลังปุ่มกด Toggle</span>
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
                  <span className="text-xs leading-[1.3] text-text-secondary">เปิดกางข้อมูลเชิงลึกและ SWOT Analysis อัตโนมัติ</span>
                </div>
                {disclosure === 'advanced' && <Check size={18} className="shrink-0 text-brand" />}
              </button>
            </div>
          </fieldset>

          {/* 3. Theme Selection */}
          <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
            <legend className="mb-1 flex items-center gap-2 text-sm font-bold text-foreground">
              <Monitor size={16} aria-hidden="true" />
              <span>ธีมสีของระบบ (Visual Theme)</span>
            </legend>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
              <button
                type="button"
                className={cn(optionClassName, theme === 'light' && 'border-brand bg-brand-dim')}
                onClick={() => setTheme('light')}
                aria-pressed={theme === 'light'}
              >
                <div className="flex flex-col gap-1 pr-4">
                  <span className="text-sm font-bold text-foreground">Light Mode (ค่าเริ่มต้น)</span>
                  <span className="text-xs leading-[1.3] text-text-secondary">ธีมสีสว่างพื้นหลังสีเทาอ่อน สบายตาในเวลากลางวัน</span>
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
                  <span className="text-xs leading-[1.3] text-text-secondary">ธีมสีดำดีไซน์ Dark Terminal ดั้งเดิม</span>
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
                  <span className="text-xs leading-[1.3] text-text-secondary">สลับโหมดสีอัตโนมัติตามการตั้งค่าระบบปฏิบัติการของเครื่อง</span>
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
            {saving ? 'กำลังตั้งค่า...' : 'บันทึกและเริ่มต้นใช้งาน'}
          </button>
        </form>
      </main>
    </div>
  );
}
