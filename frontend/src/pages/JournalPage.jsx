import { useState, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';

export default function JournalPage() {
  const [filter, setFilter] = useState('ALL');
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/journal')
      .then((res) => res.json())
      .then((data) => setTrades(data.trades || []))
      .catch(() => setTrades([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredTrades = trades.filter((t) => filter === 'ALL' || t.status === filter);

  return (
    <div className="journal-page">
      <div className="glass-panel journal-header">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>บันทึกการเทรดและวิเคราะห์หลังจบเกม (Post-Mortem)</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>ทบทวนการตัดสินใจของ AI และติดตามสมมติฐานการลงทุน</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`btn-secondary ${filter === 'ALL' ? 'active' : ''}`}
              style={{
                width: 'auto',
                padding: '6px 16px',
                background: filter === 'ALL' ? 'rgba(var(--text-inverse-rgb),0.1)' : '',
              }}
              onClick={() => setFilter('ALL')}
            >
              ทั้งหมด
            </button>
            <button
              className={`btn-secondary ${filter === 'OPEN' ? 'active' : ''}`}
              style={{
                width: 'auto',
                padding: '6px 16px',
                background: filter === 'OPEN' ? 'rgba(var(--text-inverse-rgb),0.1)' : '',
              }}
              onClick={() => setFilter('OPEN')}
            >
              สถานะเปิด
            </button>
            <button
              className={`btn-secondary ${filter === 'CLOSED' ? 'active' : ''}`}
              style={{
                width: 'auto',
                padding: '6px 16px',
                background: filter === 'CLOSED' ? 'rgba(var(--text-inverse-rgb),0.1)' : '',
              }}
              onClick={() => setFilter('CLOSED')}
            >
              ปิดแล้ว
            </button>
          </div>
        </div>
      </div>

      <div className="glass-panel journal-trades">
        <div className="panel-header">
          <span className="panel-title">ประวัติคำสั่งซื้อขาย</span>
        </div>
        <div className="watchlist-table">
          <table>
            <thead>
              <tr>
                <th>วันที่</th>
                <th>ชื่อหุ้น</th>
                <th>ประเภท</th>
                <th>จำนวนหุ้น</th>
                <th>ราคา</th>
                <th>โหมด</th>
                <th>สถานะ</th>
                <th>P/L</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(4)
                  .fill(0)
                  .map((_, i) => (
                    <tr key={`skel-${i}`}>
                      <td>
                        <div className="skeleton" style={{ width: '120px', height: '20px' }} />
                      </td>
                      <td>
                        <div className="skeleton" style={{ width: '60px', height: '20px' }} />
                      </td>
                      <td>
                        <div className="skeleton" style={{ width: '50px', height: '20px' }} />
                      </td>
                      <td>
                        <div className="skeleton" style={{ width: '40px', height: '20px' }} />
                      </td>
                      <td>
                        <div className="skeleton" style={{ width: '70px', height: '20px' }} />
                      </td>
                      <td>
                        <div className="skeleton" style={{ width: '80px', height: '20px' }} />
                      </td>
                      <td>
                        <div className="skeleton" style={{ width: '60px', height: '20px' }} />
                      </td>
                      <td>
                        <div className="skeleton" style={{ width: '50px', height: '20px' }} />
                      </td>
                    </tr>
                  ))
              ) : filteredTrades.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    style={{
                      textAlign: 'center',
                      padding: '60px 0',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <div
                      style={{
                        marginBottom: '12px',
                        display: 'flex',
                        justifyContent: 'center',
                      }}
                    >
                      <BarChart3 size={40} opacity={0.4} />
                    </div>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>ไม่มีบันทึกการเทรด{filter !== 'ALL' && 'ในสถานะนี้'}</div>
                    <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>สร้างแผนการเทรดและบันทึกเพื่อติดตามผลได้ที่นี่</div>
                  </td>
                </tr>
              ) : (
                filteredTrades.map((t) => (
                  <tr key={t.id || t.created_at} className="watchlist-row">
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {t.date
                        ? t.date
                        : t.created_at && !isNaN(Date.parse(t.created_at))
                          ? new Date(t.created_at).toLocaleString('th-TH', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : '-'}
                    </td>
                    <td style={{ fontWeight: 600 }}>{t.ticker}</td>
                    <td>
                      <span
                        style={{
                          color: t.type === 'BUY' ? 'var(--fin-profit)' : 'var(--fin-loss)',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                        }}
                      >
                        {t.type || 'TRADE'}
                      </span>
                    </td>
                    <td>{t.shares || '-'}</td>
                    <td className="price-mono">
                      ฿
                      {Number.isFinite(parseFloat(t.price))
                        ? parseFloat(t.price).toFixed(2)
                        : Number.isFinite(parseFloat(t.entry))
                          ? parseFloat(t.entry).toFixed(2)
                          : '0.00'}
                    </td>
                    <td>
                      <span
                        className="panel-badge"
                        style={{
                          background: 'rgba(var(--text-inverse-rgb),0.05)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {t.mode || 'N/A'}
                      </span>
                    </td>
                    <td>
                      <span
                        className="panel-badge"
                        style={{
                          background: t.status === 'OPEN' ? 'var(--brand-glow)' : 'rgba(var(--text-inverse-rgb),0.1)',
                          color: t.status === 'OPEN' ? 'var(--brand-primary)' : 'var(--text-secondary)',
                        }}
                      >
                        {t.status || 'OPEN'}
                      </span>
                    </td>
                    <td>
                      {t.profit ? (
                        <span
                          className="price-mono"
                          style={{
                            color: t.profit >= 0 ? 'var(--fin-profit)' : 'var(--fin-loss)',
                          }}
                        >
                          {t.profit >= 0 ? '+' : ''}฿{t.profit}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-panel journal-perf">
        <div className="panel-title">วิเคราะห์ประสิทธิภาพ (Performance Analytics)</div>
        <div className="perf-chart-placeholder">
          <div className="perf-chart-icon">📈</div>
          <div>การแสดงกราฟจำเป็นต้องใช้ข้อมูลย้อนหลัง...</div>
          <button className="btn-secondary" style={{ width: 'auto', marginTop: '10px' }}>
            โหลดประวัติทั้งหมด
          </button>
        </div>
      </div>
    </div>
  );
}
