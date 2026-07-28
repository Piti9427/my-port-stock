import { useMemo, useState } from 'react';
import { Drawer } from './ui/Drawer.jsx';
import { currencySymbol } from '../lib/format';

function numeric(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function ScenarioPlannerContent({ open, ticker, holding, onClose, onLogTrade }) {
  const [supports, setSupports] = useState({ s1: '', s2: '', s3: '' });
  const [stopLoss, setStopLoss] = useState('');
  const [target, setTarget] = useState('');
  const [budget, setBudget] = useState(10000);
  const [held, setHeld] = useState(Number(holding?.shares) || 0);
  const [averageCost, setAverageCost] = useState(Number(holding?.avg_cost ?? holding?.avgCost) || 0);

  const rows = useMemo(() => {
    const stop = numeric(stopLoss);
    const targetPrice = numeric(target);
    return Object.entries(supports)
      .map(([key, value], index) => ({ key, label: `S${index + 1}`, entry: numeric(value) }))
      .filter((row) => row.entry && row.entry > 0)
      .map((row) => {
        const addedShares = budget > 0 ? Math.floor(budget / row.entry) : 0;
        const totalShares = held + addedShares;
        const newAverage = totalShares > 0 ? (held * averageCost + addedShares * row.entry) / totalShares : 0;
        const reward = targetPrice != null ? targetPrice - row.entry : null;
        const risk = stop != null ? row.entry - stop : null;
        return {
          ...row,
          addedShares,
          newAverage,
          rr: reward != null && risk > 0 ? reward / risk : null,
        };
      });
  }, [averageCost, budget, held, stopLoss, supports, target]);

  const validation = useMemo(() => {
    const s1 = numeric(supports.s1);
    const s2 = numeric(supports.s2);
    const s3 = numeric(supports.s3);
    const stop = numeric(stopLoss);
    const targetPrice = numeric(target);
    const supportOrderInvalid = (s1 != null && s2 != null && s1 < s2) || (s2 != null && s3 != null && s2 < s3);
    const targetStopInvalid = targetPrice != null && stop != null && targetPrice <= stop;
    const entryStopInvalid = rows.some((row) => stop != null && row.entry <= stop);
    return { supportOrderInvalid, targetStopInvalid, entryStopInvalid };
  }, [rows, stopLoss, supports, target]);

  const hasErrors = Object.values(validation).some(Boolean);

  return (
    <Drawer open={open} onClose={onClose} title={`${ticker} Scenario Planner`} width="min(560px, 100vw)">
      <div className="[display:grid] [gap:var(--space-5)]">
        <div className="[display:grid] [grid-template-columns:repeat(3,_minmax(0,_1fr))] [gap:var(--space-3)] [&_label]:[display:grid] [&_label]:[gap:var(--space-2)] [&_label]:[color:var(--text-secondary)] [&_label]:[font-size:0.75rem] [&_label]:[font-weight:600] [&_input]:[width:100%] [&_input]:[min-height:40px] [&_input]:[border:1px_solid_var(--border-subtle)] [&_input]:[border-radius:var(--radius-xs)] [&_input]:[outline:none] [&_input]:[background:var(--bg-panel-solid)] [&_input]:[color:var(--text-primary)] [&_input]:font-mono [&_input]:[padding:0_var(--space-3)] [&_input:focus]:[border-color:var(--brand-primary)] max-[640px]:[grid-template-columns:minmax(0,_1fr)]">
          <label>
            จำนวนหุ้นที่มี
            <input type="number" min="0" value={held} onChange={(event) => setHeld(Number(event.target.value))} />
          </label>
          <label>
            ราคาเฉลี่ย
            <input type="number" min="0" step="0.01" value={averageCost} onChange={(event) => setAverageCost(Number(event.target.value))} />
          </label>
          <label>
            งบซื้อเพิ่ม
            <input type="number" min="0" step="100" value={budget} onChange={(event) => setBudget(Number(event.target.value))} />
          </label>
        </div>

        <div className="[display:grid] [grid-template-columns:repeat(3,_minmax(0,_1fr))] [gap:var(--space-2)]" aria-label="Quick fill budget">
          {[5000, 10000, 25000].map((amount) => (
            <button
              key={amount}
              className="[background:var(--bg-panel)] [border:1px_solid_var(--border-subtle)] [color:var(--text-secondary)] [border-radius:var(--radius-xs)] [padding:4px_8px] [font-size:0.75rem] [cursor:pointer] [transition:var(--transition)] [flex:1] hover:[background:var(--bg-panel-hover)] hover:[color:var(--text-primary)] hover:[border-color:var(--border-medium)]"
              type="button"
              onClick={() => setBudget(amount)}
            >
              ฿{amount / 1000}k
            </button>
          ))}
        </div>

        <div className="[display:grid] [grid-template-columns:repeat(3,_minmax(0,_1fr))] [gap:var(--space-3)] [&_label]:[display:grid] [&_label]:[gap:var(--space-2)] [&_label]:[color:var(--text-secondary)] [&_label]:[font-size:0.75rem] [&_label]:[font-weight:600] [&_input]:[width:100%] [&_input]:[min-height:40px] [&_input]:[border:1px_solid_var(--border-subtle)] [&_input]:[border-radius:var(--radius-xs)] [&_input]:[outline:none] [&_input]:[background:var(--bg-panel-solid)] [&_input]:[color:var(--text-primary)] [&_input]:font-mono [&_input]:[padding:0_var(--space-3)] [&_input:focus]:[border-color:var(--brand-primary)] max-[640px]:[grid-template-columns:minmax(0,_1fr)]">
          {Object.keys(supports).map((key, index) => (
            <label key={key}>
              แนวรับ {index + 1}
              <input
                type="number"
                min="0"
                step="0.01"
                value={supports[key]}
                onChange={(event) => setSupports((current) => ({ ...current, [key]: event.target.value }))}
              />
            </label>
          ))}
        </div>

        <div className="[display:grid] [grid-template-columns:repeat(3,_minmax(0,_1fr))] [gap:var(--space-3)] [grid-template-columns:repeat(2,_minmax(0,_1fr))] [&_label]:[display:grid] [&_label]:[gap:var(--space-2)] [&_label]:[color:var(--text-secondary)] [&_label]:[font-size:0.75rem] [&_label]:[font-weight:600] [&_input]:[width:100%] [&_input]:[min-height:40px] [&_input]:[border:1px_solid_var(--border-subtle)] [&_input]:[border-radius:var(--radius-xs)] [&_input]:[outline:none] [&_input]:[background:var(--bg-panel-solid)] [&_input]:[color:var(--text-primary)] [&_input]:font-mono [&_input]:[padding:0_var(--space-3)] [&_input:focus]:[border-color:var(--brand-primary)] max-[640px]:[grid-template-columns:minmax(0,_1fr)]">
          <label>
            จุดตัดขาดทุน
            <input type="number" min="0" step="0.01" value={stopLoss} onChange={(event) => setStopLoss(event.target.value)} />
          </label>
          <label>
            ราคาเป้าหมาย
            <input type="number" min="0" step="0.01" value={target} onChange={(event) => setTarget(event.target.value)} />
          </label>
        </div>

        {hasErrors && (
          <div
            className="[background:var(--fin-loss-dim)] [border:1px_solid_rgba(var(--status-danger-rgb),_0.3)] [color:var(--fin-loss)] [padding:10px_12px] [border-radius:var(--radius-sm)] [font-size:0.8rem] [margin-bottom:12px] [display:flex] [flex-direction:column] [gap:4px]"
            role="alert"
          >
            {validation.supportOrderInvalid && <div>แนวรับต้องเรียงจาก S1 สูงสุดไป S3 ต่ำสุด</div>}
            {validation.targetStopInvalid && <div>ราคาเป้าหมายต้องสูงกว่าจุดตัดขาดทุน</div>}
            {validation.entryStopInvalid && <div>แนวรับต้องสูงกว่าจุดตัดขาดทุน</div>}
          </div>
        )}

        {rows.length > 0 ? (
          <div className="[overflow-x:auto]">
            <table className="w-full border-collapse text-[0.8rem] max-[640px]:min-w-[620px] [&_td]:border-b [&_td]:border-border-subtle [&_td]:px-2.5 [&_td]:py-2.5 [&_td]:align-middle [&_td]:font-mono [&_th]:border-b [&_th]:border-border-subtle [&_th]:px-2.5 [&_th]:py-2 [&_th]:text-left [&_th]:text-[0.67rem] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-[0.07em] [&_th]:text-text-secondary [&_tr:hover_td]:bg-panel-hover">
              <thead>
                <tr>
                  <th>ระดับ</th>
                  <th>จุดเข้า</th>
                  <th>หุ้นเพิ่ม</th>
                  <th>ทุนใหม่</th>
                  <th>R/R</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key}>
                    <td>{row.label}</td>
                    <td>
                      {currencySymbol(ticker)}
                      {row.entry.toFixed(2)}
                    </td>
                    <td>{row.addedShares}</td>
                    <td>
                      {currencySymbol(ticker)}
                      {row.newAverage.toFixed(2)}
                    </td>
                    <td>{row.rr == null ? '—' : `1:${row.rr.toFixed(1)}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="[margin:0] [padding:var(--space-5)] [border:1px_dashed_var(--border-subtle)] [color:var(--text-secondary)] [font-size:0.8rem] [text-align:center]">
            กรอกแนวรับอย่างน้อยหนึ่งระดับเพื่อคำนวณแผน
          </p>
        )}

        {onLogTrade && (
          <button
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border border-transparent bg-brand px-5 py-3 font-sans text-sm font-bold tracking-wide text-text-inverse transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-hover disabled:text-text-secondary"
            type="button"
            disabled={hasErrors || rows.length === 0}
            onClick={() => onLogTrade({ ticker, rows })}
          >
            เปิดบันทึกเทรด
          </button>
        )}
      </div>
    </Drawer>
  );
}

export function ScenarioPlanner(props) {
  const { holding, open, ticker } = props;
  const stateKey = [open ? 'open' : 'closed', ticker, Number(holding?.shares) || 0, Number(holding?.avg_cost ?? holding?.avgCost) || 0].join(':');

  return <ScenarioPlannerContent key={stateKey} {...props} />;
}
