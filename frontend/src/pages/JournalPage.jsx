import { useState } from 'react';

const MOCK_TRADES = [
  { id: 1, date: '2026-06-09 14:30', ticker: 'AAPL', type: 'BUY', shares: 50, price: 210.50, mode: 'Swing Trade', rr: 2.5, status: 'OPEN' },
  { id: 2, date: '2026-06-08 10:15', ticker: 'TSLA', type: 'SELL', shares: 100, price: 185.20, mode: 'Quick Trade', rr: 1.8, status: 'CLOSED', profit: +450 },
  { id: 3, date: '2026-06-05 09:45', ticker: 'NVDA', type: 'BUY', shares: 20, price: 115.00, mode: 'Core', rr: 3.0, status: 'OPEN' },
  { id: 4, date: '2026-06-01 15:50', ticker: 'AMZN', type: 'SELL', shares: 30, price: 215.10, mode: 'Swing Trade', rr: 1.2, status: 'CLOSED', profit: -120 },
];

export default function JournalPage() {
  const [filter, setFilter] = useState('ALL');

  const filteredTrades = MOCK_TRADES.filter(t => filter === 'ALL' || t.status === filter);

  return (
    <div className="journal-page">
      <div className="glass-panel journal-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>บันทึกการเทรดและวิเคราะห์หลังจบเกม (Post-Mortem)</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>ทบทวนการตัดสินใจของ AI และติดตามสมมติฐานการลงทุน</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className={`btn-secondary ${filter === 'ALL' ? 'active' : ''}`} style={{ width: 'auto', padding: '6px 16px', background: filter === 'ALL' ? 'rgba(255,255,255,0.1)' : '' }} onClick={() => setFilter('ALL')}>ทั้งหมด</button>
            <button className={`btn-secondary ${filter === 'OPEN' ? 'active' : ''}`} style={{ width: 'auto', padding: '6px 16px', background: filter === 'OPEN' ? 'rgba(255,255,255,0.1)' : '' }} onClick={() => setFilter('OPEN')}>สถานะเปิด</button>
            <button className={`btn-secondary ${filter === 'CLOSED' ? 'active' : ''}`} style={{ width: 'auto', padding: '6px 16px', background: filter === 'CLOSED' ? 'rgba(255,255,255,0.1)' : '' }} onClick={() => setFilter('CLOSED')}>ปิดแล้ว</button>
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
              {filteredTrades.map(t => (
                <tr key={t.id} className="watchlist-row">
                  <td style={{ color: 'var(--text-secondary)' }}>{t.date}</td>
                  <td style={{ fontWeight: 600 }}>{t.ticker}</td>
                  <td>
                    <span style={{ 
                      color: t.type === 'BUY' ? 'var(--fin-profit)' : 'var(--fin-loss)',
                      fontWeight: 700, fontSize: '0.8rem' 
                    }}>
                      {t.type}
                    </span>
                  </td>
                  <td>{t.shares}</td>
                  <td className="price-mono">฿{t.price.toFixed(2)}</td>
                  <td><span className="panel-badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>{t.mode}</span></td>
                  <td>
                    <span className="panel-badge" style={{ 
                      background: t.status === 'OPEN' ? 'var(--brand-glow)' : 'rgba(255,255,255,0.1)', 
                      color: t.status === 'OPEN' ? '#60a5fa' : 'var(--text-secondary)' 
                    }}>
                      {t.status}
                    </span>
                  </td>
                  <td>
                    {t.profit ? (
                      <span className="price-mono" style={{ color: t.profit >= 0 ? 'var(--fin-profit)' : 'var(--fin-loss)' }}>
                        {t.profit >= 0 ? '+' : ''}฿{t.profit}
                      </span>
                    ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-panel journal-perf">
        <div className="panel-title">วิเคราะห์ประสิทธิภาพ (Performance Analytics)</div>
        <div className="perf-chart-placeholder">
          <div className="perf-chart-icon">📈</div>
          <div>การแสดงกราฟจำเป็นต้องใช้ข้อมูลย้อนหลัง...</div>
          <button className="btn-secondary" style={{ width: 'auto', marginTop: '10px' }}>โหลดประวัติทั้งหมด</button>
        </div>
      </div>
    </div>
  );
}
