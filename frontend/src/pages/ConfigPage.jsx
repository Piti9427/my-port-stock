import { useState, useEffect, useMemo } from 'react';
import { Save, RotateCcw, ShieldCheck, AlertCircle } from 'lucide-react';

const STORAGE_KEY = 'myportstock_config_v1';

const DEFAULT_CONFIG = {
  maxPositionPct: 10,
  maxSectorPct: 35,
  maxSpeculativePct: 20,
  hardRiskPerTradeTHB: 25000,
  maxPortfolioDrawdownPct: 15,
  minRR: 2.0,
  minConvictionScore: 5.0,
  alertOnBreachPct: 85,
  preferredModes: ['Swing Trade', 'Core'],
  apiKey: '',
  geminiModel: 'gemini-2.5-pro',
};

function SliderField({ id, label, description, value, min, max, step = 1, unit = '%', onChange, warn, danger }) {
  const pct = ((value - min) / (max - min)) * 100;
  const isWarn = warn !== undefined && value >= warn;
  const isDanger = danger !== undefined && value >= danger;
  const trackColor = isDanger ? 'var(--fin-loss)' : isWarn ? 'var(--fin-warning)' : 'var(--brand-primary)';
  return (
    <div className="config-field">
      <div className="config-field-header">
        <label htmlFor={id} className="config-field-label">
          {label}
        </label>
        <span
          className="config-field-value"
          style={{
            color: isDanger ? 'var(--fin-loss)' : isWarn ? 'var(--fin-warning)' : 'var(--text-primary)',
          }}
        >
          {typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(1) : value}
          {unit}
        </span>
      </div>
      <p className="config-field-desc">{description}</p>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="config-slider"
        style={{ '--track-fill': trackColor, '--fill-pct': `${pct}%` }}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value}${unit}`}
      />
      <div className="config-slider-labels">
        <span>
          {min}
          {unit}
        </span>
        <span>
          {max}
          {unit}
        </span>
      </div>
    </div>
  );
}

function NumberField({ id, label, description, value, onChange, prefix = '', suffix = '' }) {
  return (
    <div className="config-field">
      <div className="config-field-header">
        <label htmlFor={id} className="config-field-label">
          {label}
        </label>
      </div>
      <p className="config-field-desc">{description}</p>
      <div className="config-input-wrap">
        {prefix && <span className="config-input-prefix">{prefix}</span>}
        <input
          id={id}
          type="number"
          className="form-input"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            borderRadius: prefix ? '0 var(--radius-xs) var(--radius-xs) 0' : 'var(--radius-xs)',
          }}
        />
        {suffix && <span className="config-input-suffix">{suffix}</span>}
      </div>
    </div>
  );
}

export default function ConfigPage() {
  const [config, setConfig] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...DEFAULT_CONFIG, ...JSON.parse(stored) } : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });
  const [savedConfig, setSavedConfig] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...DEFAULT_CONFIG, ...JSON.parse(stored) } : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState('risk');

  const hasChanges = useMemo(() => {
    return JSON.stringify(config) !== JSON.stringify(savedConfig);
  }, [config, savedConfig]);

  const update = (key) => (val) => setConfig((c) => ({ ...c, [key]: val }));

  const handleSave = () => {
    try {
      // Don't persist the API key to localStorage for security
      const { apiKey, ...toStore } = config;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
      setSavedConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setSaved(false);
    }
  };

  const handleReset = () => {
    if (!hasChanges && JSON.stringify(config) === JSON.stringify(DEFAULT_CONFIG)) return;
    if (!window.confirm('ต้องการคืนค่าการตั้งค่าเริ่มต้นทั้งหมดหรือไม่? (ไม่สามารถย้อนกลับได้)')) return;
    setConfig(DEFAULT_CONFIG);
    setSavedConfig(DEFAULT_CONFIG);
    localStorage.removeItem(STORAGE_KEY);
  };

  const sections = [
    { id: 'risk', label: 'ขีดจำกัดความเสี่ยง' },
    { id: 'execution', label: 'เงื่อนไขการเทรด' },
    { id: 'ai', label: 'การวิเคราะห์ของ AI' },
    { id: 'alerts', label: 'การแจ้งเตือน & API' },
  ];

  return (
    <div className="config-page">
      {/* Sidebar Nav */}
      <div className="config-sidenav">
        <div className="config-sidenav-header">
          <ShieldCheck size={18} aria-hidden="true" style={{ color: 'var(--brand-primary)' }} />
          <span>กฎของระบบ</span>
          {hasChanges && (
            <span className="unsaved-badge" role="status" aria-label="Unsaved changes">
              <AlertCircle size={12} aria-hidden="true" /> ยังไม่ได้บันทึก
            </span>
          )}
        </div>
        <p className="config-sidenav-desc">ขีดจำกัดสูงสุดที่ควบคุมโดย AI ระบบจะเริ่มใช้ค่าใหม่ในการวิเคราะห์ครั้งถัดไป</p>
        <nav className="config-sections-nav">
          {sections.map((s) => (
            <button key={s.id} className={`config-section-btn ${activeSection === s.id ? 'active' : ''}`} onClick={() => setActiveSection(s.id)}>
              {s.label}
            </button>
          ))}
        </nav>
        <div className="config-sidenav-actions">
          <button className="btn-analyze" onClick={handleSave} aria-live="polite">
            <Save size={15} aria-hidden="true" />
            {saved ? 'บันทึกแล้ว!' : hasChanges ? 'บันทึกการเปลี่ยนแปลง' : 'บันทึกแล้ว'}
          </button>
          <button
            className="btn-secondary"
            style={{ width: '100%', opacity: hasChanges ? 1 : 0.5 }}
            onClick={handleReset}
            disabled={!hasChanges && JSON.stringify(config) === JSON.stringify(DEFAULT_CONFIG)}
          >
            <RotateCcw size={13} aria-hidden="true" style={{ display: 'inline', marginRight: 6 }} />
            คืนค่าเริ่มต้น
          </button>
        </div>
      </div>

      {/* Config Content */}
      <div className="config-content">
        {activeSection === 'risk' && (
          <div className="config-section-content">
            <div className="config-section-title">
              <h2>ขีดจำกัดความเสี่ยง</h2>
              <p>กำหนดจุดจำกัดความเสี่ยงสูงสุด เพื่อควบคุมการตัดสินใจของ AI และการเทรดของคุณ</p>
            </div>
            <div className="config-fields">
              <SliderField
                id="maxPositionPct"
                label="สัดส่วนสูงสุดต่อหุ้น 1 ตัว"
                description="จำกัดสัดส่วนสูงสุดในการถือหุ้นตัวใดตัวหนึ่ง (เป็นเปอร์เซ็นต์ของพอร์ต)"
                value={config.maxPositionPct}
                min={1}
                max={25}
                unit="%"
                onChange={update('maxPositionPct')}
                warn={15}
                danger={20}
              />
              <SliderField
                id="maxSectorPct"
                label="สัดส่วนสูงสุดต่อกลุ่มอุตสาหกรรม"
                description="จำกัดสัดส่วนสูงสุดในการถือหุ้นในกลุ่มอุตสาหกรรมเดียวกัน"
                value={config.maxSectorPct}
                min={10}
                max={60}
                unit="%"
                onChange={update('maxSectorPct')}
                warn={40}
                danger={50}
              />
              <SliderField
                id="maxSpeculativePct"
                label="สัดส่วนหุ้นเก็งกำไรสูงสุด"
                description="จำกัดสัดส่วนรวมของหุ้นที่มีคะแนนความมั่นใจจาก AI ต่ำกว่า 7.0 (เทรดเร็ว, หุ้นเสี่ยงสูง)"
                value={config.maxSpeculativePct}
                min={0}
                max={50}
                unit="%"
                onChange={update('maxSpeculativePct')}
                warn={30}
                danger={40}
              />
              <SliderField
                id="maxPortfolioDrawdownPct"
                label="จำกัดการขาดทุนสะสมของพอร์ต (Drawdown Gate)"
                description="หากพอร์ตขาดทุนสะสมจากจุดสูงสุดเกินค่านี้ AI จะแนะนำให้ 'รอ' (Wait) ในการเข้าซื้อใหม่ทั้งหมด"
                value={config.maxPortfolioDrawdownPct}
                min={5}
                max={30}
                unit="%"
                onChange={update('maxPortfolioDrawdownPct')}
                warn={20}
                danger={25}
              />
            </div>
          </div>
        )}

        {activeSection === 'execution' && (
          <div className="config-section-content">
            <div className="config-section-title">
              <h2>เงื่อนไขการเทรด</h2>
              <p>ตัวกรองก่อนการเทรดที่จะถูกนำมาใช้ก่อนที่ AI จะแนะนำให้ "ซื้อ" หรือ "ซื้อเพิ่ม"</p>
            </div>
            <div className="config-fields">
              <NumberField
                id="hardRiskPerTrade"
                label="ความเสี่ยงสูงสุดต่อไม้ (THB)"
                description="จำกัดจำนวนเงินทุนสูงสุดที่ยอมเสียได้จากจุดเข้าซื้อถึงจุดตัดขาดทุนต่อการเทรดหนึ่งครั้ง AI จะปฏิเสธการเข้าซื้อที่ใช้เงินทุนเกินกว่านี้"
                value={config.hardRiskPerTradeTHB}
                onChange={update('hardRiskPerTradeTHB')}
                prefix="฿"
              />
              <SliderField
                id="minRR"
                label="อัตราผลตอบแทนต่อความเสี่ยงขั้นต่ำ (Risk/Reward)"
                description="การเทรดที่มี R/R ต่ำกว่านี้จะถูกแนะนำให้ 'รอ' (Wait) โดยไม่สนใจคะแนนความมั่นใจ"
                value={config.minRR}
                min={1.0}
                max={5.0}
                step={0.1}
                unit=":1"
                onChange={update('minRR')}
                warn={1.5}
                danger={1.2}
              />
              <SliderField
                id="minConvictionScore"
                label="คะแนนความมั่นใจขั้นต่ำ (Buy gate)"
                description="คะแนนจาก AI ที่ต่ำกว่าค่านี้จะได้รับคำแนะนำให้ 'รอ' หรือ 'หลีกเลี่ยง' และจะไม่มีวันแนะนำให้ 'ซื้อ' หรือ 'ซื้อเพิ่ม'"
                value={config.minConvictionScore}
                min={4.0}
                max={8.0}
                step={0.1}
                unit="/10"
                onChange={update('minConvictionScore')}
                warn={4.5}
                danger={4.2}
              />
            </div>
          </div>
        )}

        {activeSection === 'ai' && (
          <div className="config-section-content">
            <div className="config-section-title">
              <h2>การตั้งค่า AI Council</h2>
              <p>ควบคุมว่า Agent ตัวใดจะทำงาน และตั้งค่าโหมดการตัดสินใจเริ่มต้น</p>
            </div>
            <div className="config-fields">
              <div className="config-field">
                <div className="config-field-header">
                  <span className="config-field-label">โมเดล Gemini</span>
                </div>
                <p className="config-field-desc">โมเดลที่ใช้สำหรับ Agent ทั้งหมด (มีผลต่อความเร็วและความลึกของการวิเคราะห์)</p>
                <select className="mode-select" value={config.geminiModel} onChange={(e) => update('geminiModel')(e.target.value)}>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro (Recommended)</option>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (Faster)</option>
                  <option value="gemini-2.0-pro">Gemini 2.0 Pro (Legacy)</option>
                </select>
              </div>
              <div className="config-field">
                <div className="config-field-header">
                  <span className="config-field-label">โหมดการตัดสินใจที่ใช้งานบ่อย</span>
                </div>
                <p className="config-field-desc">โหมดเริ่มต้นที่จะแสดงเป็นอันดับแรกเมื่อเปิดการวิเคราะห์ (ไม่มีผลต่อการใช้งานโหมดอื่น)</p>
                <div className="mode-chips">
                  {['Quick Trade', 'Swing Trade', 'Long-Term/Core', 'Exit Review'].map((m) => (
                    <button
                      key={m}
                      className="filter-chip"
                      data-active={config.preferredModes.includes(m)}
                      onClick={() => {
                        update('preferredModes')(
                          config.preferredModes.includes(m) ? config.preferredModes.filter((x) => x !== m) : [...config.preferredModes, m]
                        );
                      }}
                      aria-pressed={config.preferredModes.includes(m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'alerts' && (
          <div className="config-section-content">
            <div className="config-section-title">
              <h2>การแจ้งเตือน &amp; API</h2>
              <p>ตั้งค่าระดับการแจ้งเตือน และการเชื่อมต่อบริการภายนอก</p>
            </div>
            <div className="config-fields">
              <SliderField
                id="alertOnBreachPct"
                label="ระดับการแจ้งเตือนล่วงหน้า"
                description="แสดงคำเตือนสีเหลืองในหน้า Risk เมื่อสัดส่วนเข้าใกล้ขีดจำกัดสูงสุด (เป็นเปอร์เซ็นต์)"
                value={config.alertOnBreachPct}
                min={60}
                max={99}
                unit="%"
                onChange={update('alertOnBreachPct')}
                warn={90}
                danger={95}
              />
              <div className="config-field">
                <div className="config-field-header">
                  <span className="config-field-label">คีย์ API ของ Gemini</span>
                </div>
                <p className="config-field-desc">
                  คีย์สำหรับเชื่อมต่อ Google AI จะถูกเก็บไว้เฉพาะในเบราว์เซอร์ของคุณเท่านั้น (ไม่ส่งไปเซิร์ฟเวอร์อื่น)
                </p>
                <input
                  id="apiKey"
                  type="password"
                  className="form-input"
                  placeholder="AIza..."
                  value={config.apiKey}
                  onChange={(e) => update('apiKey')(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>

            {/* System Status */}
            <div className="config-status-block">
              <div className="config-status-title">สถานะระบบ</div>
              <div className="config-status-grid">
                <div className="config-status-item">
                  <span className="status-indicator active" />
                  <span>AI Council</span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      color: 'var(--fin-profit)',
                      fontSize: '0.8rem',
                    }}
                  >
                    ทำงานปกติ
                  </span>
                </div>
                <div className="config-status-item">
                  <span className="status-indicator done" />
                  <span>Risk Engine</span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      color: 'var(--brand-primary)',
                      fontSize: '0.8rem',
                    }}
                  >
                    กำลังทำงาน
                  </span>
                </div>
                <div className="config-status-item">
                  <span className="status-indicator idle" />
                  <span>ข้อมูลตลาด</span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      color: 'var(--text-muted)',
                      fontSize: '0.8rem',
                    }}
                  >
                    โหมดคู่มือ (Manual)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
