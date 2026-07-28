import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../auth/clerkAdapter';
import { usePortfolio } from '../hooks/usePortfolio';
import { DEFAULT_SECTOR_LIMIT, buildPortfolioRisk } from '../components/risk/riskCalculations';
import { Alert, AlertDescription } from '../components/ui/alert';
import { EmptyState } from '../components/ui/EmptyState';
import { cn } from '@/lib/utils';

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
      <div className="flex-1 p-8 max-w-5xl mx-auto w-full">
        <EmptyState
          title="ยังไม่มีพอร์ตการลงทุน 📈"
          description="ระบบไม่สามารถวิเคราะห์และประเมินเพดานความเสี่ยงได้ เนื่องจากยังไม่มีหุ้นในพอร์ตโฟลิโอของคุณ เริ่มต้นโดยการเพิ่มหุ้นตัวแรกในระบบบันทึกเทรด"
          action={{ label: 'ไปที่หน้าบันทึกเทรด', onClick: () => navigate('/journal') }}
        />
      </div>
    );
  }

  if (unavailable) {
    return (
      <div className="flex-1 p-8 max-w-5xl mx-auto w-full">
        <EmptyState
          title="Insufficient data"
          description="เกิดข้อผิดพลาดในการดึงข้อมูลจากระบบฐานข้อมูล กรุณาลองใหม่อีกครั้ง"
          action={{ label: 'ลองใหม่อีกครั้ง', onClick: refetch }}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full bg-neutral-950 text-neutral-100">
      <header className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-neutral-100">Portfolio Risk Controls</h2>
        <p className="text-xs text-neutral-400">Position sizing and risk budget parameters derived from portfolio data.</p>
      </header>

      {/* Risk Alert Banners */}
      {risk.missingStopCount > 0 && (
        <Alert variant="destructive" className="border-rose-500/30 bg-rose-500/10 text-rose-300">
          <ShieldAlert className="h-4 w-4 text-rose-400" />
          <AlertDescription className="text-xs font-medium">
            ⚠️ Risk Warning: Found {risk.missingStopCount} position(s) missing stop-loss prices. Risk calculations may understate total portfolio
            downside!
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Metrics Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 border border-neutral-800 rounded-xl bg-neutral-900/60 backdrop-blur-sm flex flex-col justify-between">
          <div className="text-xs font-semibold text-neutral-400">Total Portfolio Value</div>
          <div className="text-2xl font-bold font-mono text-neutral-100 mt-2">{formatCurrency(risk.totalPortfolioValue)}</div>
          <div className="text-[0.7rem] text-neutral-500 mt-1">{risk.positionCount} active positions</div>
        </div>

        <div className="p-5 border border-neutral-800 rounded-xl bg-neutral-900/60 backdrop-blur-sm flex flex-col justify-between">
          <div className="text-xs font-semibold text-neutral-400">THB Risk Budget (Max {risk.maxRiskPct}%)</div>
          <div className="text-2xl font-bold font-mono text-neutral-100 mt-2">{formatCurrency(risk.riskBudget)}</div>
          <div className="text-[0.7rem] text-neutral-500 mt-1">Single Trade Limit: {formatCurrency(risk.maxRiskPerTrade)}</div>
        </div>

        <div className="p-5 border border-neutral-800 rounded-xl bg-neutral-900/60 backdrop-blur-sm flex flex-col justify-between">
          <div className="text-xs font-semibold text-neutral-400">Known Hard Stop Risk</div>
          <div className={cn('text-2xl font-bold font-mono mt-2', risk.knownRisk > risk.riskBudget ? 'text-rose-400' : 'text-emerald-400')}>
            {formatCurrency(risk.knownRisk)}
          </div>
          <div className="text-[0.7rem] text-neutral-500 mt-1">
            งบประมาณ {formatCurrency(risk.riskBudget)} · {missingStopCopy(risk.missingStopCount)}
          </div>
        </div>

        <div className="p-5 border border-neutral-800 rounded-xl bg-neutral-900/60 backdrop-blur-sm flex flex-col justify-between">
          <div className="text-xs font-semibold text-neutral-400">Risk Budget Utilization</div>
          <div className="text-2xl font-bold font-mono text-neutral-100 mt-2">{formatPercent(risk.riskBudgetPct)}</div>
          <div
            role="progressbar"
            aria-label="Risk budget used"
            aria-valuemin={0}
            aria-valuenow={risk.knownRisk}
            aria-valuemax={risk.riskBudget}
            className="w-full h-1.5 mt-2 bg-neutral-800 rounded-full overflow-hidden"
          >
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, (risk.knownRisk / risk.riskBudget) * 100)}%` }} />
          </div>
        </div>
      </section>

      {/* Sector Concentration */}
      <section className="p-6 border border-neutral-800 rounded-xl bg-neutral-900/60 backdrop-blur-sm flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <span className="text-sm font-bold text-neutral-200">Sector Concentration Limits (Max {DEFAULT_SECTOR_LIMIT}%)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {risk.sectors.map((sec) => {
            const isBreached = sec.weight > sec.limit;
            const isSelected = activeSector?.sector === sec.sector;
            const statusLabel = isBreached ? 'Over limit' : 'Within limit';
            const accessibleLabel = `${sec.sector}: ${sec.weight.toFixed(1)} percent of portfolio, limit ${sec.limit} percent, ${statusLabel}`;
            return (
              <button
                key={sec.sector}
                type="button"
                aria-label={accessibleLabel}
                aria-pressed={isSelected}
                className={cn(
                  'p-4 text-left border rounded-lg transition-all',
                  isBreached
                    ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                    : 'border-neutral-800 bg-neutral-900/40 hover:bg-neutral-800/60 text-neutral-300',
                  isSelected && 'ring-2 ring-emerald-500'
                )}
                onClick={() => setSelectedSector(sec.sector)}
              >
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span>{sec.sector}</span>
                  <span className="font-mono">{formatPercent(sec.weight)}</span>
                </div>
                <div className="text-[0.68rem] text-neutral-400 mt-1 flex justify-between">
                  <span>Limit: {sec.limit}%</span>
                  <span className={isBreached ? 'text-rose-400 font-bold' : 'text-emerald-400'}>{statusLabel}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Sector Holdings Detail */}
      {activeSector && (
        <section
          className="p-6 border border-neutral-800 rounded-xl bg-neutral-900/60 backdrop-blur-sm flex flex-col gap-4"
          aria-label={`${activeSector.sector} holdings`}
        >
          <div className="text-sm font-bold text-neutral-200">{activeSector.sector} Holdings</div>
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-neutral-900 border-b border-neutral-800 text-neutral-400">
                <tr>
                  <th className="p-3">Ticker</th>
                  <th className="p-3">Value</th>
                  <th className="p-3">Weight%</th>
                  <th className="p-3">Stop Distance</th>
                  <th className="p-3">THB Risk</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {activeSector.holdings.map((h) => (
                  <tr key={h.ticker} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="p-3 font-bold text-neutral-100">{h.ticker}</td>
                    <td className="p-3 font-mono text-neutral-200">{formatCurrency(h.value)}</td>
                    <td className="p-3 font-mono text-neutral-300">{formatPercent(h.weight)}</td>
                    <td className="p-3 font-mono text-neutral-300">{h.stopDistancePct != null ? `${h.stopDistancePct.toFixed(1)}%` : 'Unknown'}</td>
                    <td className="p-3 font-mono text-neutral-300">{h.thbRisk != null ? formatCurrency(h.thbRisk) : 'Unknown'}</td>
                    <td className="p-3">
                      <span
                        className={cn(
                          'px-2 py-0.5 text-[0.7rem] font-bold rounded',
                          h.status === 'Stop defined' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        )}
                      >
                        {h.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
