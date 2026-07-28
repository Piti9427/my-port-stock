import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../auth/clerkAdapter';
import { usePortfolio } from '../hooks/usePortfolio';
import { DEFAULT_SECTOR_LIMIT, buildPortfolioRisk } from '../components/risk/riskCalculations';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Progress } from '../components/ui/progress';
import { EmptyState } from '../components/ui/EmptyState';
import { cn, cssVars } from '../lib/utils';

function sectorDrilldownSubtitle(sector) {
  if (sector.weight > sector.limit) return 'Highest breach risk';
  return 'Highest current allocation';
}

function formatCurrency(value) {
  if (!Number.isFinite(Number(value))) return 'Unknown';
  return `฿${Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function formatPercent(value) {
  if (!Number.isFinite(Number(value))) return 'Unknown';
  return `${Number(value).toFixed(1)}%`;
}

function missingStopCopy(count) {
  if (count === 0) return 'All positions have stop-loss data';
  if (count === 1) return '1 position missing stop-loss';
  return `${count} positions missing stop-loss`;
}

function riskBudgetTone(risk) {
  if (risk.missingStopCount > 0 || risk.knownRisk > risk.riskBudget) return 'text-fin-loss';
  if (risk.riskBudgetPct >= 80) return 'text-fin-warning';
  return 'text-foreground';
}

export default function PortfolioRiskPage() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [selectedSector, setSelectedSector] = useState(null);
  const { holdings, loading, status, refetch } = usePortfolio({ getToken });

  const risk = useMemo(() => buildPortfolioRisk(holdings), [holdings]);

  const activeSector = useMemo(() => {
    if (selectedSector) {
      return risk.sectors.find((sector) => sector.sector === selectedSector) || risk.sectors[0] || null;
    }
    return risk.overLimit[0] || risk.sectors[0] || null;
  }, [risk.sectors, risk.overLimit, selectedSector]);

  const unavailable = status === 'ERROR' || status === 'UNAUTHORIZED' || status === 'INSUFFICIENT_DATA';

  if (!loading && !unavailable && holdings.length === 0) {
    return (
      <div className="[flex:1_1_auto] [min-height:0] [overflow-y:auto] [padding:24px_28px] [display:flex] [flex-direction:column] [gap:16px] max-[768px]:![overflow-y:visible] max-[768px]:![height:auto] max-[768px]:![min-height:0]">
        <EmptyState
          title="ยังไม่มีพอร์ตการลงทุน 📈"
          description="ระบบไม่สามารถวิเคราะห์และประเมินเพดานความเสี่ยงได้ เนื่องจากยังไม่มีหุ้นในพอร์ตโฟลิโอของคุณ เริ่มต้นโดยการเพิ่มหุ้นตัวแรกในระบบบันทึกเทรด"
          action="บันทึกเทรดตัวแรก"
          onAction={() => navigate('/journal')}
        />
      </div>
    );
  }

  const sectorTreemapContent = (() => {
    if (loading) {
      return <EmptyState title="Loading portfolio risk..." />;
    }
    if (unavailable) {
      return (
        <EmptyState
          title="Insufficient data"
          description="Connect Supabase data or run analysis before this panel can calculate."
          action="Retry"
          onAction={refetch}
        />
      );
    }
    if (risk.sectors.length === 0) {
      return (
        <EmptyState
          title="เพิ่มหุ้นในพอร์ตเพื่อดูความเสี่ยง"
          description="ยังไม่มี Supabase holdings สำหรับบัญชีนี้ จึงยังคำนวณ sector, stop-loss, และ risk budget ไม่ได้"
        />
      );
    }
    return (
      <div className="[flex:1] [overflow-y:auto] [padding:8px_12px_12px] [display:flex] [flex-direction:column] [gap:2px]">
        {risk.sectors.map((sector) => {
          const pct = Math.min((sector.weight / sector.limit) * 100, 100);
          const isOver = sector.weight > sector.limit;
          const active = activeSector?.sector === sector.sector;

          return (
            <button
              key={sector.sector}
              type="button"
              className={cn(
                'grid w-full cursor-pointer grid-cols-[140px_minmax(0,1fr)_120px_20px] items-center gap-3 rounded-sm border border-transparent bg-transparent px-3 py-2 text-left transition-colors hover:border-border-subtle hover:bg-panel-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                active && 'border-brand bg-brand-dim'
              )}
              onClick={() => setSelectedSector(sector.sector)}
              aria-pressed={active}
              aria-label={`${sector.sector}: ${sector.weight.toFixed(1)} percent of portfolio, limit ${sector.limit} percent, ${sector.statusLabel}`}
            >
              <div className="[font-size:0.82rem] [font-weight:500] [color:var(--text-primary)] [white-space:nowrap]">{sector.sector}</div>
              <div className="[position:relative] [height:4px] [background:rgba(var(--text-inverse-rgb),_0.06)] [border-radius:2px] [overflow:hidden]">
                <div
                  className={cn(
                    'h-full w-full origin-left scale-x-[var(--sector-scale)] transition-transform duration-500',
                    isOver ? 'bg-fin-loss' : 'bg-fin-profit'
                  )}
                  style={cssVars({ '--sector-scale': pct / 100 })}
                />
                <div className="absolute inset-y-0 left-full z-[2] w-0.5 -translate-x-1/2 bg-text-secondary" />
              </div>
              <div className="[display:flex] [align-items:center] [gap:4px] [justify-content:flex-end]">
                <span className={cn('font-mono text-[0.82rem] font-semibold', isOver ? 'text-fin-loss' : 'text-fin-profit')}>
                  {sector.weight.toFixed(1)}%
                </span>
                <span className="[font-size:0.72rem] [color:var(--text-secondary)]">/ เพดาน {sector.limit}%</span>
                <span className="sr-only">{sector.statusLabel}</span>
              </div>
            </button>
          );
        })}
      </div>
    );
  })();

  return (
    <div className="[flex:1_1_auto] [min-height:0] [overflow-y:auto] [padding:24px_28px] [display:flex] [flex-direction:column] [gap:16px] max-[768px]:![overflow-y:visible] max-[768px]:![height:auto] max-[768px]:![min-height:0]">
      {risk.overLimit.length > 0 && (
        <Alert variant="destructive" className="mb-4">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            คำเตือนสัดส่วนการลงทุน: <strong>{risk.overLimit.map((s) => s.sector).join(', ')}</strong> เกินเพดานที่ตั้งไว้
          </AlertDescription>
        </Alert>
      )}

      <div className="max-[900px]:[grid-template-columns:1fr] [display:grid] [grid-template-columns:repeat(3,_1fr)] [gap:12px] max-[1200px]:[grid-template-columns:repeat(auto-fit,_minmax(240px,_1fr))]">
        <div className="rounded-lg border border-border bg-panel shadow-none [padding:16px_20px] [border:1px_solid_var(--border-subtle)] [border-radius:var(--radius-md)] [background:var(--bg-panel)]">
          <div className="mb-1 text-[0.68rem] font-semibold uppercase tracking-[0.07em] text-text-secondary">มูลค่าพอร์ต</div>
          <div className="mb-1 font-mono text-[1.4rem] font-semibold leading-[1.15] text-foreground">
            {risk.totalValue > 0 ? formatCurrency(risk.totalValue) : '—'}
          </div>
          <div className="text-xs text-text-secondary">{holdings.length} สถานะจาก Supabase</div>
        </div>
        <div className="rounded-lg border border-border bg-panel shadow-none [padding:16px_20px] [border:1px_solid_var(--border-subtle)] [border-radius:var(--radius-md)] [background:var(--bg-panel)]">
          <div className="mb-1 text-[0.68rem] font-semibold uppercase tracking-[0.07em] text-text-secondary">กลุ่มที่เกินเพดาน</div>
          <div
            className={cn(
              'mb-1 font-mono text-[1.4rem] font-semibold leading-[1.15]',
              risk.overLimit.length > 0 ? 'text-fin-loss' : 'text-foreground'
            )}
          >
            {risk.overLimit.length}
          </div>
          <div className="text-xs text-text-secondary">เพดานเริ่มต้น {DEFAULT_SECTOR_LIMIT}% ต่อ sector</div>
        </div>
        <div className="rounded-lg border border-border bg-panel shadow-none [padding:16px_20px] [border:1px_solid_var(--border-subtle)] [border-radius:var(--radius-md)] [background:var(--bg-panel)] [gap:10px]">
          <div className="mb-1 text-[0.68rem] font-semibold uppercase tracking-[0.07em] text-text-secondary">Risk Budget Used</div>
          <div className={cn('mb-1 font-mono text-[1.4rem] font-semibold leading-[1.15]', riskBudgetTone(risk))}>
            {formatCurrency(risk.knownRisk)}
          </div>
          <Progress
            value={Math.min(risk.riskBudgetPct, 100)}
            className="my-3 h-1.5"
            role="progressbar"
            aria-label="Risk budget used"
            aria-valuemin={0}
            aria-valuenow={Math.round(risk.knownRisk)}
            aria-valuemax={risk.riskBudget}
          />
          <div className="text-xs text-text-secondary">
            งบประมาณ {formatCurrency(risk.riskBudget)} ({risk.riskBudgetPct.toFixed(0)}%) • {missingStopCopy(risk.missingStopCount)}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-panel shadow-none [padding:var(--space-5)]">
        <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-6 py-4 max-[640px]:flex-col max-[640px]:items-start">
          <div>
            <h2 className="mb-0.5 text-[0.95rem] font-semibold text-foreground">การกระจายความเสี่ยงรายกลุ่ม</h2>
            <p className="text-pretty [margin:0] [padding:var(--space-3)] [border:1px_solid_rgba(var(--status-warning-rgb),_0.36)] [color:var(--fin-warning)] [font-size:0.76rem] text-xs text-text-secondary">
              คำนวณจาก holdings จริง ไม่มีข้อมูลจำลอง
            </p>
          </div>
        </div>

        {sectorTreemapContent}

        {activeSector && (
          <section
            className="[margin-top:24px] [border-top:1px_solid_var(--border-subtle)] [padding-top:20px]"
            aria-label={`${activeSector.sector} holdings`}
          >
            <div className="mb-0.5 text-[0.95rem] font-semibold text-foreground">Showing: {activeSector.sector}</div>
            <div className="text-pretty [margin:0] [padding:var(--space-3)] [border:1px_solid_rgba(var(--status-warning-rgb),_0.36)] [color:var(--fin-warning)] [font-size:0.76rem] text-xs text-text-secondary">
              {sectorDrilldownSubtitle(activeSector)}
            </div>
            <div
              className="mt-4 overflow-x-auto pb-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border-medium [&::-webkit-scrollbar-thumb:hover]:bg-border-strong [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:size-1.5"
              tabIndex={0}
              role="region"
              aria-label="Position risk table"
            >
              <table className="[width:100%] [border-collapse:collapse] [font-size:0.82rem] [text-align:left] [&_th]:[padding:9px_12px] [&_th]:[font-size:0.67rem] [&_th]:[font-weight:600] [&_th]:[letter-spacing:0.04em] [&_th]:[text-transform:uppercase] [&_th]:[color:var(--text-secondary)] [&_th]:[border-bottom:1px_solid_var(--border-subtle)] [&_td]:[padding:11px_12px] [&_td]:[border-bottom:1px_solid_rgba(var(--text-inverse-rgb),_0.06)] [&_td]:[color:var(--text-secondary)] [&_td:first-child]:[color:var(--text-primary)] [&_td:first-child]:[font-weight:700]">
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Value</th>
                    <th>Weight%</th>
                    <th>Stop Distance</th>
                    <th>THB Risk</th>
                    <th>P/L THB</th>
                    <th>Age</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSector.holdings.map((holding) => (
                    <tr
                      key={holding.id || holding.ticker}
                      className={cn(holding.thbRisk === null && 'bg-fin-warning-dim', holding.time_stop_hit && 'bg-fin-loss-dim')}
                    >
                      <td>
                        <div className="flex items-center gap-1">
                          {holding.ticker}
                          {holding.time_stop_hit && (
                            <span
                              className="rounded border border-fin-loss bg-fin-loss-dim px-1 py-0.5 font-mono text-[0.65rem] text-fin-loss"
                              title="Time Stop limit exceeded. Recycling of capital recommended."
                            >
                              ⏰ Time Stop
                            </span>
                          )}
                        </div>
                      </td>
                      <td>{formatCurrency(holding.value)}</td>
                      <td>{formatPercent(holding.weight)}</td>
                      <td>{holding.stopDistancePct === null ? 'Unknown' : formatPercent(holding.stopDistancePct)}</td>
                      <td>{holding.thbRisk === null ? 'Unknown' : formatCurrency(holding.thbRisk)}</td>
                      <td className={holding.pl_thb >= 0 ? 'text-fin-profit' : 'text-fin-loss'}>
                        {holding.pl_thb !== undefined
                          ? `${holding.pl_thb >= 0 ? '+' : ''}${Number(holding.pl_thb).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                          : '—'}
                      </td>
                      <td className={holding.time_stop_hit ? 'text-fin-loss' : undefined}>
                        {holding.age_days !== undefined ? `${holding.age_days} วัน` : '—'}
                      </td>
                      <td>{holding.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
