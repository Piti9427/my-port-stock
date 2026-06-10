import { useState } from 'react';

export default function Dashboard() {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: 'AAPL', portfolioData: { shares: 100 } })
      });
      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      setAnalysis({ error: 'Failed to fetch' });
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Portfolio Dashboard</h1>
      <button onClick={handleAnalyze} disabled={loading}>
        {loading ? 'Analyzing...' : 'Analyze AAPL'}
      </button>
      
      {analysis && analysis.price && (
        <div style={{ marginTop: '20px', padding: '10px', border: '1px solid #ccc' }}>
          <h3>AAPL - Live Price: ${analysis.price}</h3>
          <p><strong>AI Verdict:</strong> {analysis.analysis}</p>
        </div>
      )}
    </div>
  );
}
