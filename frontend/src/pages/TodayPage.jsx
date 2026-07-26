import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, Clock, ArrowRight, ChevronDown, ChevronUp, ShieldAlert, HelpCircle, Activity, CheckCircle, X } from 'lucide-react';
import { useAuth } from '../auth/clerkAdapter';
import { useToday } from '../hooks/useToday';
import { EmptyState } from '../components/ui/EmptyState';

// Helper for formatting large THB numbers
function formatCurrency(value) {
  if (!Number.isFinite(Number(value))) return '฿0';
  const prefix = value < 0 ? '-' : '';
  return `${prefix}฿${Math.abs(Number(value)).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function formatPercent(value) {
  if (!Number.isFinite(Number(value))) return '0.0%';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${Number(value).toFixed(1)}%`;
}

function getDismissalKey(item) {
  return `myportstock_dismissed_${item.category}_${item.type}_${item.ticker || 'global'}`;
}

export default function TodayPage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { queue, pulse, loading, status, refetch } = useToday({ getToken });
  const [expandedCardId, setExpandedCardId] = useState(null);
  const [activeMobileIndex, setActiveMobileIndex] = useState(0);
  const [dismissedKeys, setDismissedKeys] = useState(() => {
    try {
      const keys = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('myportstock_dismissed_')) {
          keys[key] = localStorage.getItem(key);
        }
      }
      return keys;
    } catch (e) {
      console.error('Failed to load dismissed keys from localStorage', e);
      return {};
    }
  });

  const [mountTime] = useState(() => new Date().getTime());

  // Filter queue based on active (non-expired) dismissals
  const activeQueue = useMemo(() => {
    return queue.filter((item) => {
      const key = getDismissalKey(item);
      const dismissedAtStr = dismissedKeys[key];
      if (!dismissedAtStr) return true;

      const dismissedAt = new Date(dismissedAtStr).getTime();
      const expiryDuration =
        item.category === 'protect'
          ? 24 * 60 * 60 * 1000 // 24 hours
          : 7 * 24 * 60 * 60 * 1000; // 7 days

      if (mountTime - dismissedAt > expiryDuration) {
        // Expiry passed, cleanup key in background
        try {
          localStorage.removeItem(key);
        } catch {
          // ignore cleanup errors
        }
        return true;
      }
      return false;
    });
  }, [queue, dismissedKeys, mountTime]);

  const handleDismiss = (item, e) => {
    e.stopPropagation();
    const key = getDismissalKey(item);
    const nowStr = new Date().toISOString();
    try {
      localStorage.setItem(key, nowStr);
      setDismissedKeys((prev) => ({ ...prev, [key]: nowStr }));
      // Adjust mobile index if we dismiss the last card in the queue
      if (activeMobileIndex >= activeQueue.length - 1 && activeMobileIndex > 0) {
        setActiveMobileIndex((prev) => prev - 1);
      }
    } catch (err) {
      console.error('Failed to save dismissal to localStorage', err);
    }
  };

  const handleCtaClick = (route, e) => {
    e.stopPropagation();
    navigate(route);
  };

  const toggleExpand = (cardId) => {
    setExpandedCardId(expandedCardId === cardId ? null : cardId);
  };

  const unavailable = status === 'ERROR' || status === 'UNAUTHORIZED' || status === 'INSUFFICIENT_DATA';

  // Render cards categories/colors
  const getCategoryStyles = (category) => {
    switch (category) {
      case 'protect':
        return {
          borderClass: 'today-card-protect',
          icon: <ShieldAlert className="today-card-icon text-loss" />,
          label: 'PROTECT CAPITAL',
          labelClass: 'tag-protect',
        };
      case 'prepare':
        return {
          borderClass: 'today-card-prepare',
          icon: <Clock className="today-card-icon text-warning" />,
          label: 'PREPARE',
          labelClass: 'tag-prepare',
        };
      case 'opportunity':
        return {
          borderClass: 'today-card-opportunity',
          icon: <TrendingUp className="today-card-icon text-info" />,
          label: 'OPPORTUNITY',
          labelClass: 'tag-opportunity',
        };
      case 'learn':
        return {
          borderClass: 'today-card-learn',
          icon: <CheckCircle className="today-card-icon text-profit" />,
          label: 'LEARN',
          labelClass: 'tag-learn',
        };
      default:
        return {
          borderClass: '',
          icon: <HelpCircle className="today-card-icon" />,
          label: 'ACTION REQUIRED',
          labelClass: '',
        };
    }
  };

  const pulseContent = (
    <div className="today-pulse-container">
      <div className="today-pulse-title">
        <Activity className="pulse-title-icon" />
        <span>PORTFOLIO PULSE</span>
      </div>

      <div className="today-pulse-metric-row">
        <div className="today-pulse-metric">
          <div className="today-pulse-metric-label">TOTAL VALUE</div>
          <div className="today-pulse-metric-value num-font">{formatCurrency(pulse.totalValue)}</div>
        </div>
        <div className="today-pulse-metric">
          <div className="today-pulse-metric-label">UNREALIZED P/L</div>
          <div className={`today-pulse-metric-value num-font ${pulse.totalPl >= 0 ? 'text-profit' : 'text-loss'}`}>
            {formatPercent(pulse.totalCost > 0 ? (pulse.totalPl / pulse.totalCost) * 100 : 0)}
          </div>
        </div>
      </div>

      <div className="today-pulse-section">
        <div className="today-pulse-section-header">
          <span>PORTFOLIO DRAWDOWN</span>
          <span className="num-font">
            {pulse.drawdownPct.toFixed(1)}% / {pulse.maxDrawdownPct}%
          </span>
        </div>
        <div className="today-pulse-bar-track">
          <div
            className={`today-pulse-bar-fill ${pulse.drawdownPct >= pulse.maxDrawdownPct ? 'bar-breached' : ''}`}
            style={{ transform: `scaleX(${Math.min(pulse.drawdownPct / pulse.maxDrawdownPct, 1)})`, transformOrigin: 'left' }}
          />
        </div>
        {pulse.drawdownPct >= pulse.maxDrawdownPct && (
          <div className="today-pulse-warning">🛑 Drawdown circuit-breaker active. New buys blocked.</div>
        )}
      </div>

      <div className="today-pulse-section">
        <div className="today-pulse-section-header">
          <span>SPECULATIVE EXPOSURE</span>
          <span className="num-font">{pulse.speculativeWeightPct.toFixed(1)}% / 20%</span>
        </div>
        <div className="today-pulse-bar-track">
          <div
            className={`today-pulse-bar-fill ${pulse.speculativeWeightPct > 20 ? 'bar-breached' : ''}`}
            style={{ transform: `scaleX(${Math.min(pulse.speculativeWeightPct / 20, 1)})`, transformOrigin: 'left' }}
          />
        </div>
      </div>

      {pulse.sectorBreaches && pulse.sectorBreaches.length > 0 && (
        <div className="today-pulse-section">
          <div className="today-pulse-section-header text-warning">
            <span>SECTOR BREACHES</span>
          </div>
          <div className="today-pulse-breach-list">
            {pulse.sectorBreaches.map((b) => (
              <div key={b.sector} className="today-pulse-breach-item">
                <span>{b.sector}</span>
                <span className="num-font text-loss">{b.weight}% &gt; 35%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {pulse.missingStopCount > 0 && (
        <div className="today-pulse-alert-box alert-loss">
          <ShieldAlert className="alert-box-icon" />
          <span>
            {pulse.missingStopCount} position{pulse.missingStopCount > 1 ? 's' : ''} missing stop-loss definitions
          </span>
        </div>
      )}
    </div>
  );

  const isBrandNew = !loading && !unavailable && (!pulse || (pulse.totalValue === 0 && queue.length === 0));

  return (
    <div className="today-page">
      <div className="today-description">ตรวจสอบสัญญาณพอร์ตโฟลิโอและการกระทำตามระบบประเมินความเสี่ยงรายวัน</div>

      {isBrandNew ? (
        <EmptyState
          title="ยินดีต้อนรับสู่ระบบประเมินความเสี่ยงพอร์ตโฟลิโอ 📈"
          description="ยังไม่มีหุ้นหรือประวัติคำสั่งซื้อขายในพอร์ตของคุณในขณะนี้ เริ่มต้นโดยการเพิ่มหุ้นตัวแรกผ่านเมนูบันทึกการเทรดเพื่อคำนวณและแสดงผลสัญญาณความเสี่ยงรายวัน"
          action="บันทึกเทรดตัวแรก"
          onAction={() => navigate('/journal')}
        />
      ) : loading ? (
        <div className="today-content-loading">
          <EmptyState title="กำลังโหลดข้อมูลสัญญาณ..." description="ระบบกำลังตรวจสอบสถานะความเสี่ยงของพอร์ตและอัปเดตราคาตลาดปัจจุบัน" />
        </div>
      ) : unavailable ? (
        <div className="today-content-error">
          <EmptyState
            title="ไม่สามารถโหลดข้อมูลสัญญาณได้"
            description="ไม่พบคอนฟิกระบบ Supabase หรือข้อมูลราคาตลาดขัดข้อง โปรดตรวจสอบคอนฟิกและลองใหม่อีกครั้ง"
            action="Refetch Data"
            onAction={refetch}
          />
        </div>
      ) : activeQueue.length === 0 ? (
        <div className="today-main-layout empty-layout">
          <div className="today-queue-area">
            {queue.length > 0 ? (
              <EmptyState
                title="เคลียร์คิวสัญญาณเรียบร้อยแล้ว 🎯"
                description="สัญญาณที่มีทั้งหมดได้รับการ Dismiss หรือตรวจสอบชั่วคราวแล้ว ระบบจะแสดงสัญญาณอีกครั้งตามเงื่อนไขความเสี่ยงใหม่"
              />
            ) : (
              <EmptyState
                title="พอร์ตโฟลิโอเป็นปกติ ไม่มีสัญญาณเตือนภัยวันนี้ 🎉"
                description="พอร์ตการลงทุนปัจจุบันมีความสอดคล้องกับมาตรฐานความเสี่ยงและกฎ SOP ทุกข้อเรียบร้อย"
                action="วิเคราะห์หุ้นเพิ่ม"
                onAction={() => navigate('/command-center')}
              />
            )}
          </div>
          <div className="today-sidebar-area">{pulseContent}</div>
        </div>
      ) : (
        <div className="today-main-layout">
          {/* Desktop view list */}
          <div className="today-queue-area desktop-only">
            <AnimatePresence initial={false}>
              {activeQueue.map((item, idx) => {
                const styles = getCategoryStyles(item.category);
                const cardId = `${item.category}_${item.type}_${item.ticker || 'global'}_${idx}`;
                const isExpanded = expandedCardId === cardId;

                return (
                  <motion.div
                    key={cardId}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 20, height: 0 }}
                    transition={{
                      duration: 0.25,
                      ease: [0.16, 1, 0.3, 1],
                      delay: idx * 0.05,
                    }}
                    whileHover={{ scale: 1.008 }}
                    whileTap={{ scale: 0.992 }}
                    className={`today-card ${styles.borderClass}`}
                    onClick={() => toggleExpand(cardId)}
                  >
                    <div className="today-card-header">
                      <div className="today-card-badge-row">
                        <span className={`today-card-category-tag ${styles.labelClass}`}>
                          {item.category === 'protect' && <span className="tag-pulse-dot" />}
                          {styles.label}
                        </span>
                        {item.ticker && <span className="today-card-ticker-tag num-font">{item.ticker}</span>}
                      </div>
                      <button className="today-card-dismiss-btn" onClick={(e) => handleDismiss(item, e)} aria-label="Dismiss alarm">
                        <X className="dismiss-btn-icon" />
                      </button>
                    </div>

                    <div className="today-card-body">
                      {styles.icon}
                      <div className="today-card-text">
                        <div className="today-card-reason">{item.reason}</div>
                      </div>
                    </div>

                    <div className="today-card-actions">
                      <button className="today-card-cta-btn button-primary" onClick={(e) => handleCtaClick(item.ctaRoute, e)}>
                        <span>{item.cta}</span>
                        <ArrowRight className="cta-icon" />
                      </button>
                      <button className="today-card-expand-btn">
                        {isExpanded ? <ChevronUp className="expand-icon" /> : <ChevronDown className="expand-icon" />}
                      </button>
                    </div>

                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="today-card-expanded-content"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="today-card-evidence-divider" />
                        <div className="today-card-evidence-grid">
                          {Object.entries(item.evidence || {}).map(([key, val]) => (
                            <div key={key} className="today-card-evidence-item">
                              <div className="evidence-label">{key.replace(/([A-Z])/g, ' $1').toUpperCase()}</div>
                              <div className="evidence-value num-font">
                                {typeof val === 'number' ? val.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(val)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Mobile view cycler (1 card at a time with buttons) */}
          <div className="today-queue-area mobile-only">
            {(() => {
              const currentItem = activeQueue[activeMobileIndex];
              if (!currentItem) return null;
              const styles = getCategoryStyles(currentItem.category);
              const cardId = `mobile_${currentItem.category}_${currentItem.type}_${currentItem.ticker || 'global'}`;

              return (
                <div className="today-mobile-card-container">
                  <div className="today-mobile-card-indicator">
                    <span>
                      สัญญาณเตือน {activeMobileIndex + 1} จาก {activeQueue.length}
                    </span>
                  </div>

                  <motion.div
                    key={cardId}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={`today-card ${styles.borderClass}`}
                  >
                    <div className="today-card-header">
                      <div className="today-card-badge-row">
                        <span className={`today-card-category-tag ${styles.labelClass}`}>
                          {currentItem.category === 'protect' && <span className="tag-pulse-dot" />}
                          {styles.label}
                        </span>
                        {currentItem.ticker && <span className="today-card-ticker-tag num-font">{currentItem.ticker}</span>}
                      </div>
                      <button className="today-card-dismiss-btn" onClick={(e) => handleDismiss(currentItem, e)} aria-label="Dismiss Alarm">
                        <X className="dismiss-btn-icon" />
                      </button>
                    </div>

                    <div className="today-card-body">
                      {styles.icon}
                      <div className="today-card-text">
                        <div className="today-card-reason">{currentItem.reason}</div>
                      </div>
                    </div>

                    <div className="today-card-actions">
                      <button className="today-card-cta-btn button-primary" onClick={(e) => handleCtaClick(currentItem.ctaRoute, e)}>
                        <span>{currentItem.cta}</span>
                        <ArrowRight className="cta-icon" />
                      </button>
                    </div>

                    <div className="today-card-expanded-content mobile-evidence">
                      <div className="today-card-evidence-divider" />
                      <div className="today-card-evidence-grid">
                        {Object.entries(currentItem.evidence || {}).map(([key, val]) => (
                          <div key={key} className="today-card-evidence-item">
                            <div className="evidence-label">{key.toUpperCase()}</div>
                            <div className="evidence-value num-font">{typeof val === 'number' ? val.toFixed(2) : String(val)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>

                  <div className="today-mobile-navigation-row">
                    <button
                      className="today-mobile-nav-btn"
                      disabled={activeMobileIndex === 0}
                      onClick={() => setActiveMobileIndex((prev) => prev - 1)}
                    >
                      ย้อนกลับ / Prev
                    </button>
                    <button
                      className="today-mobile-nav-btn button-primary"
                      disabled={activeMobileIndex === activeQueue.length - 1}
                      onClick={() => setActiveMobileIndex((prev) => prev + 1)}
                    >
                      ถัดไป / Next
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="today-sidebar-area">{pulseContent}</div>
        </div>
      )}
    </div>
  );
}
