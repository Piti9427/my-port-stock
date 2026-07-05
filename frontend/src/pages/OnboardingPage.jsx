// frontend/src/pages/OnboardingPage.jsx
import { useState } from 'react';
import { usePreferences } from '../hooks/usePreferences';
import { Check, Coins, Eye, Monitor } from 'lucide-react';

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
    <div className="onboarding-page-container">
      <main className="glass-panel onboarding-card" aria-labelledby="onboarding-title">
        <header className="onboarding-header">
          <h1 id="onboarding-title">ยินดีต้อนรับสู่ MyPortStock</h1>
          <p className="onboarding-subtitle">กรุณาตั้งค่าเริ่มต้นสำหรับพอร์ตของคุณเพื่อเริ่มต้นใช้งาน</p>
        </header>

        {error && (
          <div className="onboarding-error-banner" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="onboarding-form">
          {/* 1. Currency Selection */}
          <fieldset className="onboarding-fieldset">
            <legend className="onboarding-legend">
              <Coins size={16} aria-hidden="true" />
              <span>สกุลเงินที่ใช้รายงานผล (Reporting Currency)</span>
            </legend>
            <div className="onboarding-options-grid">
              <button
                type="button"
                className={`onboarding-option-button ${currency === 'THB' ? 'active' : ''}`}
                onClick={() => setCurrency('THB')}
                aria-pressed={currency === 'THB'}
              >
                <div className="onboarding-option-content">
                  <span className="onboarding-option-title">THB (฿)</span>
                  <span className="onboarding-option-desc">แสดงมูลค่าพอร์ตและรายการเทรดเป็นเงินบาท</span>
                </div>
                {currency === 'THB' && <Check size={18} className="option-check-icon" />}
              </button>

              <button
                type="button"
                className={`onboarding-option-button ${currency === 'USD' ? 'active' : ''}`}
                onClick={() => setCurrency('USD')}
                aria-pressed={currency === 'USD'}
              >
                <div className="onboarding-option-content">
                  <span className="onboarding-option-title">USD ($)</span>
                  <span className="onboarding-option-desc">แสดงมูลค่าพอร์ตและรายการเทรดเป็นดอลลาร์สหรัฐ</span>
                </div>
                {currency === 'USD' && <Check size={18} className="option-check-icon" />}
              </button>
            </div>
          </fieldset>

          {/* 2. Disclosure Level Selection */}
          <fieldset className="onboarding-fieldset">
            <legend className="onboarding-legend">
              <Eye size={16} aria-hidden="true" />
              <span>ระดับการเปิดเผยข้อมูล (Disclosure Level)</span>
            </legend>
            <div className="onboarding-options-grid">
              <button
                type="button"
                className={`onboarding-option-button ${disclosure === 'beginner' ? 'active' : ''}`}
                onClick={() => setDisclosure('beginner')}
                aria-pressed={disclosure === 'beginner'}
              >
                <div className="onboarding-option-content">
                  <span className="onboarding-option-title">Beginner</span>
                  <span className="onboarding-option-desc">ซ่อนผลคะแนน sub-agent และสรุป SWOT ไว้หลังปุ่มกด Toggle</span>
                </div>
                {disclosure === 'beginner' && <Check size={18} className="option-check-icon" />}
              </button>

              <button
                type="button"
                className={`onboarding-option-button ${disclosure === 'advanced' ? 'active' : ''}`}
                onClick={() => setDisclosure('advanced')}
                aria-pressed={disclosure === 'advanced'}
              >
                <div className="onboarding-option-content">
                  <span className="onboarding-option-title">Advanced</span>
                  <span className="onboarding-option-desc">เปิดกางข้อมูลเชิงลึกและ SWOT Analysis อัตโนมัติ</span>
                </div>
                {disclosure === 'advanced' && <Check size={18} className="option-check-icon" />}
              </button>
            </div>
          </fieldset>

          {/* 3. Theme Selection */}
          <fieldset className="onboarding-fieldset">
            <legend className="onboarding-legend">
              <Monitor size={16} aria-hidden="true" />
              <span>ธีมสีของระบบ (Visual Theme)</span>
            </legend>
            <div className="onboarding-options-grid">
              <button
                type="button"
                className={`onboarding-option-button ${theme === 'light' ? 'active' : ''}`}
                onClick={() => setTheme('light')}
                aria-pressed={theme === 'light'}
              >
                <div className="onboarding-option-content">
                  <span className="onboarding-option-title">Light Mode (ค่าเริ่มต้น)</span>
                  <span className="onboarding-option-desc">ธีมสีสว่างพื้นหลังสีเทาอ่อน สบายตาในเวลากลางวัน</span>
                </div>
                {theme === 'light' && <Check size={18} className="option-check-icon" />}
              </button>

              <button
                type="button"
                className={`onboarding-option-button ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
                aria-pressed={theme === 'dark'}
              >
                <div className="onboarding-option-content">
                  <span className="onboarding-option-title">Dark Mode</span>
                  <span className="onboarding-option-desc">ธีมสีดำดีไซน์ Dark Terminal ดั้งเดิม</span>
                </div>
                {theme === 'dark' && <Check size={18} className="option-check-icon" />}
              </button>

              <button
                type="button"
                className={`onboarding-option-button ${theme === 'system' ? 'active' : ''}`}
                onClick={() => setTheme('system')}
                aria-pressed={theme === 'system'}
              >
                <div className="onboarding-option-content">
                  <span className="onboarding-option-title">System Mode</span>
                  <span className="onboarding-option-desc">สลับโหมดสีอัตโนมัติตามการตั้งค่าระบบปฏิบัติการของเครื่อง</span>
                </div>
                {theme === 'system' && <Check size={18} className="option-check-icon" />}
              </button>
            </div>
          </fieldset>

          <button
            type="submit"
            className="btn-primary onboarding-submit-button"
            disabled={saving}
          >
            {saving ? 'กำลังตั้งค่า...' : 'บันทึกและเริ่มต้นใช้งาน'}
          </button>
        </form>
      </main>
    </div>
  );
}
