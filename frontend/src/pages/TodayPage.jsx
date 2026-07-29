import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, Clock, ArrowRight, ChevronDown, ChevronUp, ShieldAlert, HelpCircle, Activity, CheckCircle, X } from 'lucide-react';
import { useAuth } from '../auth/clerkAdapter';
import { useToday } from '../hooks/useToday';
import { EmptyState } from '../components/ui/EmptyState';
import { useTranslation } from '../i18n/useTranslation';
import { cn, cssVars } from '../lib/utils';

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
  const { t } = useTranslation();
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
          borderClass: 'border-fin-loss',
          icon: <ShieldAlert className="[width:22px] [height:22px] [margin-top:1px] [flex-shrink:0] [color:var(--fin-loss)]" />,
          label: 'PROTECT CAPITAL',
          labelClass: 'bg-fin-loss-dim text-fin-loss',
        };
      case 'prepare':
        return {
          borderClass: 'border-fin-warning',
          icon: <Clock className="[width:22px] [height:22px] [margin-top:1px] [flex-shrink:0] [color:var(--fin-warning)]" />,
          label: 'PREPARE',
          labelClass: 'bg-fin-warning-dim text-fin-warning',
        };
      case 'opportunity':
        return {
          borderClass: 'border-fin-info',
          icon: <TrendingUp className="[width:22px] [height:22px] [margin-top:1px] [flex-shrink:0] [color:var(--accent-primary)]" />,
          label: 'OPPORTUNITY',
          labelClass: 'bg-fin-info-dim text-fin-info',
        };
      case 'learn':
        return {
          borderClass: 'border-fin-profit',
          icon: <CheckCircle className="[width:22px] [height:22px] [margin-top:1px] [flex-shrink:0] [color:var(--fin-profit)]" />,
          label: 'LEARN',
          labelClass: 'bg-fin-profit-dim text-fin-profit',
        };
      default:
        return {
          borderClass: '',
          icon: <HelpCircle className="[width:22px] [height:22px] [margin-top:1px] [flex-shrink:0]" />,
          label: 'ACTION REQUIRED',
          labelClass: '',
        };
    }
  };

  const pulseContent = (
    <div className="[background:var(--bg-shell)] [border:1px_solid_var(--border-subtle)] [border-radius:var(--radius-md)] [padding:24px] [display:flex] [flex-direction:column] [gap:20px]">
      <div className="[display:flex] [align-items:center] [gap:10px] [font-size:0.78rem] [font-weight:700] [letter-spacing:0.1em] [color:var(--text-secondary)]">
        <Activity className="[width:16px] [height:16px] [color:var(--brand-primary)]" />
        <span>PORTFOLIO PULSE</span>
      </div>

      <div className="[display:grid] [grid-template-columns:1fr_1fr] [gap:16px]">
        <div className="[display:flex] [flex-direction:column] [gap:4px]">
          <div className="[font-size:0.65rem] [font-weight:700] [letter-spacing:0.08em] [color:var(--text-secondary)]">TOTAL VALUE</div>
          <div className="[font-size:1.4rem] [font-weight:700] [color:var(--text-primary)] num-font">{formatCurrency(pulse.totalValue)}</div>
        </div>
        <div className="[display:flex] [flex-direction:column] [gap:4px]">
          <div className="[font-size:0.65rem] [font-weight:700] [letter-spacing:0.08em] [color:var(--text-secondary)]">UNREALIZED P/L</div>
          <div className={cn('font-mono text-[1.4rem] font-bold', pulse.totalPl >= 0 ? 'text-fin-profit' : 'text-fin-loss')}>
            {formatPercent(pulse.totalCost > 0 ? (pulse.totalPl / pulse.totalCost) * 100 : 0)}
          </div>
        </div>
      </div>

      <div className="[display:flex] [flex-direction:column] [gap:8px]">
        <div className="[display:flex] [justify-content:space-between] [font-size:0.68rem] [font-weight:700] [letter-spacing:0.05em] [color:var(--text-secondary)]">
          <span>PORTFOLIO DRAWDOWN</span>
          <span className="num-font">
            {pulse.drawdownPct.toFixed(1)}% / {pulse.maxDrawdownPct}%
          </span>
        </div>
        <div className="[height:6px] [background:var(--border-subtle)] [border-radius:3px] [overflow:hidden]">
          <div
            className={cn(
              'h-full origin-left scale-x-[var(--bar-scale)] rounded-[3px] bg-brand transition-transform duration-700 motion-reduce:transition-none',
              pulse.drawdownPct >= pulse.maxDrawdownPct && 'bg-fin-loss'
            )}
            style={cssVars({ '--bar-scale': Math.min(pulse.drawdownPct / pulse.maxDrawdownPct, 1) })}
          />
        </div>
        {pulse.drawdownPct >= pulse.maxDrawdownPct && (
          <div className="[font-size:0.72rem] [font-weight:600] [color:var(--fin-loss)] [margin-top:2px]">
            🛑 Drawdown circuit-breaker active. New buys blocked.
          </div>
        )}
      </div>

      <div className="[display:flex] [flex-direction:column] [gap:8px]">
        <div className="[display:flex] [justify-content:space-between] [font-size:0.68rem] [font-weight:700] [letter-spacing:0.05em] [color:var(--text-secondary)]">
          <span>SPECULATIVE EXPOSURE</span>
          <span className="num-font">{pulse.speculativeWeightPct.toFixed(1)}% / 20%</span>
        </div>
        <div className="[height:6px] [background:var(--border-subtle)] [border-radius:3px] [overflow:hidden]">
          <div
            className={cn(
              'h-full origin-left scale-x-[var(--bar-scale)] rounded-[3px] bg-brand transition-transform duration-700 motion-reduce:transition-none',
              pulse.speculativeWeightPct > 20 && 'bg-fin-loss'
            )}
            style={cssVars({ '--bar-scale': Math.min(pulse.speculativeWeightPct / 20, 1) })}
          />
        </div>
      </div>

      {pulse.sectorBreaches && pulse.sectorBreaches.length > 0 && (
        <div className="[display:flex] [flex-direction:column] [gap:8px]">
          <div className="[display:flex] [justify-content:space-between] [font-size:0.68rem] [font-weight:700] [letter-spacing:0.05em] [color:var(--text-secondary)] [color:var(--fin-warning)]">
            <span>SECTOR BREACHES</span>
          </div>
          <div className="[display:flex] [flex-direction:column] [gap:6px]">
            {pulse.sectorBreaches.map((b) => (
              <div
                key={b.sector}
                className="[display:flex] [justify-content:space-between] [font-size:0.8rem] [font-weight:500] [color:var(--text-secondary)]"
              >
                <span>{b.sector}</span>
                <span className="num-font [color:var(--fin-loss)]">{b.weight}% &gt; 35%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {pulse.missingStopCount > 0 && (
        <div className="flex items-center gap-2.5 rounded-sm border border-fin-loss bg-fin-loss-dim p-3 text-xs font-semibold leading-[1.4] text-fin-loss">
          <ShieldAlert className="[width:16px] [height:16px] [flex-shrink:0]" />
          <span>
            {pulse.missingStopCount} position{pulse.missingStopCount > 1 ? 's' : ''} missing stop-loss definitions
          </span>
        </div>
      )}
    </div>
  );

  const isBrandNew = !loading && !unavailable && (!pulse || (pulse.totalValue === 0 && queue.length === 0));

  return (
    <div className="[flex:1_1_auto] [min-height:0] [overflow-y:auto] [padding:24px_28px] [display:flex] [flex-direction:column] [gap:24px]">
      <div className="[color:var(--text-secondary)] [font-size:0.85rem] [line-height:1.5] [margin-top:-8px] [margin-bottom:8px] [max-width:75ch]">
        {t('today.subtitle')}
      </div>

      {isBrandNew ? (
        <EmptyState
          title={t('today.empty_portfolio_title')}
          description={t('today.empty_portfolio_description')}
          action={t('today.empty_portfolio_action')}
          onAction={() => navigate('/journal')}
        />
      ) : loading ? (
        <div className="[flex:1] [display:flex] [align-items:center] [justify-content:center] [min-height:300px]">
          <EmptyState title={t('today.loading_title')} description={t('today.loading_description')} />
        </div>
      ) : unavailable ? (
        <div className="[flex:1] [display:flex] [align-items:center] [justify-content:center] [min-height:300px]">
          <EmptyState title={t('today.error_title')} description={t('today.error_description')} action="Refetch Data" onAction={refetch} />
        </div>
      ) : activeQueue.length === 0 ? (
        <div className="grid grid-cols-[minmax(0,1fr)_360px] items-start gap-8 max-[768px]:grid-cols-1 max-[768px]:gap-6">
          <div className="[display:flex] [flex-direction:column] [gap:16px]">
            {queue.length > 0 ? (
              <EmptyState title={t('today.cleared_title')} description={t('today.cleared_description')} />
            ) : (
              <EmptyState
                title={t('today.healthy_title')}
                description={t('today.healthy_description')}
                action={t('today.healthy_action')}
                onAction={() => navigate('/command-center')}
              />
            )}
          </div>
          <div className="[position:sticky] [top:32px] max-[768px]:[position:static]">{pulseContent}</div>
        </div>
      ) : (
        <div className="[display:grid] [grid-template-columns:1fr_360px] [gap:32px] [align-items:start] max-[768px]:[grid-template-columns:1fr] max-[768px]:[gap:24px]">
          {/* Desktop view list */}
          <div className="[display:flex] [flex-direction:column] [gap:16px] max-[768px]:![display:none]">
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
                    className={cn(
                      'relative flex cursor-pointer flex-col gap-4 overflow-hidden rounded-md border bg-shell p-5 transition-[border-color,background-color,transform] duration-200 hover:bg-panel motion-reduce:transition-none',
                      styles.borderClass
                    )}
                    onClick={() => toggleExpand(cardId)}
                  >
                    <div className="[display:flex] [justify-content:space-between] [align-items:center]">
                      <div className="[display:flex] [gap:8px] [align-items:center]">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded px-2 py-1 text-[0.68rem] font-bold tracking-[0.08em]',
                            styles.labelClass
                          )}
                        >
                          {item.category === 'protect' && (
                            <span className="[width:6px] [height:6px] [border-radius:50%] [background:var(--fin-loss)] [animation:pulse-breathe_2.5s_ease-in-out_infinite] motion-reduce:[animation:none]" />
                          )}
                          {styles.label}
                        </span>
                        {item.ticker && (
                          <span className="font-mono [font-size:0.75rem] [font-weight:700] [background:var(--border-subtle)] [color:var(--text-primary)] [padding:2px_6px] [border-radius:4px] num-font">
                            {item.ticker}
                          </span>
                        )}
                      </div>
                      <button
                        className="flex cursor-pointer items-center justify-center rounded-full bg-transparent p-1 text-text-secondary transition-colors hover:bg-surface-hover hover:text-foreground"
                        onClick={(e) => handleDismiss(item, e)}
                        aria-label="Dismiss alarm"
                      >
                        <X className="[width:16px] [height:16px]" />
                      </button>
                    </div>

                    <div className="[display:flex] [gap:16px] [align-items:flex-start]">
                      {styles.icon}
                      <div className="[display:flex] [flex-direction:column] [gap:4px]">
                        <div className="[font-size:0.95rem] [font-weight:500] [line-height:1.5] [color:var(--text-primary)]">{item.reason}</div>
                      </div>
                    </div>

                    <div className="[display:flex] [justify-content:space-between] [align-items:center] [margin-top:8px]">
                      <button
                        className="inline-flex cursor-pointer items-center gap-2 rounded-md border-0 bg-brand px-3 py-1.5 text-[0.85rem] font-semibold text-text-inverse transition-colors hover:bg-brand-dark max-[768px]:flex-1 max-[768px]:justify-center max-[768px]:py-2.5"
                        onClick={(e) => handleCtaClick(item.ctaRoute, e)}
                      >
                        <span>{item.cta}</span>
                        <ArrowRight className="[width:14px] [height:14px]" />
                      </button>
                      <button
                        type="button"
                        className="[background:transparent] [border:none] [color:var(--text-secondary)] [cursor:pointer] [padding:6px] [border-radius:6px]"
                        aria-label={t(isExpanded ? 'today.collapse_details' : 'today.expand_details', { title: item.title })}
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? <ChevronUp className="[width:18px] [height:18px]" /> : <ChevronDown className="[width:18px] [height:18px]" />}
                      </button>
                    </div>

                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="[overflow:hidden]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="[height:1px] [background:var(--border-subtle)] [margin:12px_0]" />
                        <div className="[display:grid] [grid-template-columns:repeat(auto-fill,_minmax(130px,_1fr))] [gap:12px]">
                          {Object.entries(item.evidence || {}).map(([key, val]) => (
                            <div key={key} className="[display:flex] [flex-direction:column] [gap:2px]">
                              <div className="[font-size:0.62rem] [font-weight:700] [letter-spacing:0.05em] [color:var(--text-secondary)]">
                                {key.replace(/([A-Z])/g, ' $1').toUpperCase()}
                              </div>
                              <div className="font-mono [font-size:0.85rem] [font-weight:600] [color:var(--text-primary)] num-font">
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
          <div className="[display:flex] [flex-direction:column] [gap:16px] ![display:none] max-[768px]:![display:flex]">
            {(() => {
              const currentItem = activeQueue[activeMobileIndex];
              if (!currentItem) return null;
              const styles = getCategoryStyles(currentItem.category);
              const cardId = `mobile_${currentItem.category}_${currentItem.type}_${currentItem.ticker || 'global'}`;

              return (
                <div className="max-[768px]:[display:flex] max-[768px]:[flex-direction:column] max-[768px]:[gap:16px]">
                  <div className="max-[768px]:[font-size:0.8rem] max-[768px]:[font-weight:600] max-[768px]:[color:var(--text-secondary)] max-[768px]:[text-align:center]">
                    <span>{t('today.alert_position', { current: activeMobileIndex + 1, total: activeQueue.length })}</span>
                  </div>

                  <motion.div
                    key={cardId}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={cn(
                      'relative flex cursor-pointer flex-col gap-4 overflow-hidden rounded-md border bg-shell p-5 transition-[border-color,background-color,transform] duration-200 hover:bg-panel motion-reduce:transition-none',
                      styles.borderClass
                    )}
                  >
                    <div className="[display:flex] [justify-content:space-between] [align-items:center]">
                      <div className="[display:flex] [gap:8px] [align-items:center]">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded px-2 py-1 text-[0.68rem] font-bold tracking-[0.08em]',
                            styles.labelClass
                          )}
                        >
                          {currentItem.category === 'protect' && (
                            <span className="[width:6px] [height:6px] [border-radius:50%] [background:var(--fin-loss)] [animation:pulse-breathe_2.5s_ease-in-out_infinite] motion-reduce:[animation:none]" />
                          )}
                          {styles.label}
                        </span>
                        {currentItem.ticker && (
                          <span className="font-mono [font-size:0.75rem] [font-weight:700] [background:var(--border-subtle)] [color:var(--text-primary)] [padding:2px_6px] [border-radius:4px] num-font">
                            {currentItem.ticker}
                          </span>
                        )}
                      </div>
                      <button
                        className="flex cursor-pointer items-center justify-center rounded-full bg-transparent p-1 text-text-secondary transition-colors hover:bg-surface-hover hover:text-foreground"
                        onClick={(e) => handleDismiss(currentItem, e)}
                        aria-label="Dismiss Alarm"
                      >
                        <X className="[width:16px] [height:16px]" />
                      </button>
                    </div>

                    <div className="[display:flex] [gap:16px] [align-items:flex-start]">
                      {styles.icon}
                      <div className="[display:flex] [flex-direction:column] [gap:4px]">
                        <div className="[font-size:0.95rem] [font-weight:500] [line-height:1.5] [color:var(--text-primary)]">
                          {currentItem.reason}
                        </div>
                      </div>
                    </div>

                    <div className="[display:flex] [justify-content:space-between] [align-items:center] [margin-top:8px]">
                      <button
                        className="inline-flex cursor-pointer items-center gap-2 rounded-md border-0 bg-brand px-3 py-1.5 text-[0.85rem] font-semibold text-text-inverse transition-colors hover:bg-brand-dark max-[768px]:flex-1 max-[768px]:justify-center max-[768px]:py-2.5"
                        onClick={(e) => handleCtaClick(currentItem.ctaRoute, e)}
                      >
                        <span>{currentItem.cta}</span>
                        <ArrowRight className="[width:14px] [height:14px]" />
                      </button>
                    </div>

                    <div className="[overflow:hidden] mobile-evidence">
                      <div className="[height:1px] [background:var(--border-subtle)] [margin:12px_0]" />
                      <div className="[display:grid] [grid-template-columns:repeat(auto-fill,_minmax(130px,_1fr))] [gap:12px]">
                        {Object.entries(currentItem.evidence || {}).map(([key, val]) => (
                          <div key={key} className="[display:flex] [flex-direction:column] [gap:2px]">
                            <div className="[font-size:0.62rem] [font-weight:700] [letter-spacing:0.05em] [color:var(--text-secondary)]">
                              {key.toUpperCase()}
                            </div>
                            <div className="font-mono [font-size:0.85rem] [font-weight:600] [color:var(--text-primary)] num-font">
                              {typeof val === 'number' ? val.toFixed(2) : String(val)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>

                  <div className="max-[768px]:[display:flex] max-[768px]:[gap:12px]">
                    <button
                      className="max-[768px]:[flex:1] max-[768px]:[text-align:center] max-[768px]:[font-size:0.85rem] max-[768px]:[font-weight:600] max-[768px]:[padding:10px] max-[768px]:[border-radius:8px] max-[768px]:[background:var(--bg-shell)] max-[768px]:[border:1px_solid_var(--border-subtle)] max-[768px]:[color:var(--text-primary)] max-[768px]:[cursor:pointer] max-[768px]:disabled:[opacity:0.4] max-[768px]:disabled:[cursor:not-allowed]"
                      disabled={activeMobileIndex === 0}
                      onClick={() => setActiveMobileIndex((prev) => prev - 1)}
                    >
                      {t('today.previous')}
                    </button>
                    <button
                      className="flex-1 cursor-pointer rounded-md border-0 bg-brand p-2.5 text-center text-[0.85rem] font-semibold text-text-inverse hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-surface-hover disabled:text-text-muted"
                      disabled={activeMobileIndex === activeQueue.length - 1}
                      onClick={() => setActiveMobileIndex((prev) => prev + 1)}
                    >
                      {t('today.next')}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="[position:sticky] [top:32px] max-[768px]:[position:static]">{pulseContent}</div>
        </div>
      )}
    </div>
  );
}
