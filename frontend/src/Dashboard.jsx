import { useState } from 'react';
import './index.css';

export default function Dashboard() {
  const [ticker, setTicker] = useState('AAPL');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!ticker) return;
    setLoading(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: ticker.toUpperCase(), portfolioData: { shares: 100 } })
      });
      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      setAnalysis({ error: 'Failed to fetch analysis' });
    }
    setLoading(false);
  };

  return (
    <div className="dashboard-container">
      <div className="header">
        <h1>Antigravity Terminal</h1>
        <p>Personal AI Trading Assistant</p>
      </div>
      
      <div className="glass-panel">
        <div className="action-row">
          <input 
            type="text" 
            className="ticker-input"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="e.g. TSLA"
            maxLength={5}
          />
          <button className="btn-analyze" onClick={handleAnalyze} disabled={loading}>
            {loading ? (
              <><div className="loader"></div> Analyzing...</>
            ) : (
              'Run AI Analysis'
            )}
          </button>
        </div>
        
        {analysis && (analysis.price !== undefined || analysis.packet) && (
          <div className="result-card">
            <div className="result-header">
              <div className="ticker-badge">{analysis.ticker || analysis.packet?.ticker}</div>
              <div className="price-tag">
                {analysis.price ? `$${parseFloat(analysis.price).toFixed(2)}` : (analysis.packet?.current_price_source ? `$${analysis.packet.current_price_source.price}` : 'Data Inconclusive')}
              </div>
            </div>
            <div className="verdict-box">
              <p><strong>AI Verdict:</strong></p>
              <p style={{ marginTop: '8px' }}>
                {analysis.analysis || (analysis.decision_snapshot ? `Verdict: ${analysis.decision_snapshot.verdict}\nScore: ${analysis.decision_snapshot.score}\nReason: ${analysis.decision_snapshot.one_line_reason}` : JSON.stringify(analysis, null, 2))}
              </p>
            </div>
          </div>
        )}

        {analysis && analysis.error && (
          <div className="result-card" style={{ borderLeft: '4px solid #ef4444' }}>
            <p style={{ color: '#fca5a5' }}>Error: {analysis.error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
