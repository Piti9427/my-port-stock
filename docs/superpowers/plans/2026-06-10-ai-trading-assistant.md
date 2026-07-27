---
status: Completed
updated_at: "2026-07-27"
owner: AI Agent / Developer
---

# Personal AI Trading Assistant Web App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Markdown-based MyPortStock workflow into a Web App with automated market data fetching, Supabase storage, and an on-demand Gemini AI micro-analyst to minimize token usage.

**Architecture:** A Vite+React SPA served by an Express backend. The backend interfaces with Supabase (for portfolio/journal storage), Yahoo Finance API (for live price verification), and Gemini API (for targeted analysis). We process data server-side and only send highly focused, verified data packets to the AI.

**Tech Stack:** Node.js, Express, React (Vite), Supabase (`@supabase/supabase-js`), `yahoo-finance2`, `@google/genai`, Jest/Supertest.

---

### Task 1: Setup Backend Supabase Client

**Files:**
- Create: `src/db/supabaseClient.js`
- Create: `tests/supabaseClient.test.js`

- [ ] **Step 1: Install Dependencies**
```bash
npm install @supabase/supabase-js dotenv
```

- [ ] **Step 2: Write the failing test**
```javascript
// tests/supabaseClient.test.js
const { supabase } = require('../src/db/supabaseClient');

describe('Supabase Client', () => {
  it('should initialize the supabase client with mock env vars', () => {
    expect(supabase).toBeDefined();
    expect(supabase.supabaseUrl).toBe('https://mock.supabase.co');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**
```bash
SUPABASE_URL=https://mock.supabase.co SUPABASE_ANON_KEY=mock_key npm test tests/supabaseClient.test.js
```
Expected: FAIL (Cannot find module)

- [ ] **Step 4: Write minimal implementation**
```javascript
// src/db/supabaseClient.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://mock.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'mock_key';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = { supabase };
```

- [ ] **Step 5: Run test to verify it passes**
```bash
SUPABASE_URL=https://mock.supabase.co SUPABASE_ANON_KEY=mock_key npm test tests/supabaseClient.test.js
```
Expected: PASS

- [ ] **Step 6: Commit**
```bash
git add src/db/supabaseClient.js tests/supabaseClient.test.js package.json package-lock.json
git commit -m "feat: initialize supabase client"
```

### Task 2: Implement Market Data Service (Yahoo Finance)

**Files:**
- Create: `src/services/marketData.js`
- Create: `tests/marketData.test.js`

- [ ] **Step 1: Install Dependencies**
```bash
npm install yahoo-finance2
```

- [ ] **Step 2: Write the failing test**
```javascript
// tests/marketData.test.js
const { getLivePrice } = require('../src/services/marketData');

jest.mock('yahoo-finance2', () => ({
  default: {
    quote: jest.fn().mockResolvedValue({ regularMarketPrice: 150.50 })
  }
}));

describe('Market Data Service', () => {
  it('should return the regular market price for a given ticker', async () => {
    const price = await getLivePrice('AAPL');
    expect(price).toBe(150.50);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**
```bash
npm test tests/marketData.test.js
```
Expected: FAIL (Cannot find module)

- [ ] **Step 4: Write minimal implementation**
```javascript
// src/services/marketData.js
const yahooFinance = require('yahoo-finance2').default;

async function getLivePrice(ticker) {
  const result = await yahooFinance.quote(ticker);
  return result.regularMarketPrice;
}

module.exports = { getLivePrice };
```

- [ ] **Step 5: Run test to verify it passes**
```bash
npm test tests/marketData.test.js
```
Expected: PASS

- [ ] **Step 6: Commit**
```bash
git add src/services/marketData.js tests/marketData.test.js package.json package-lock.json
git commit -m "feat: add yahoo finance market data service"
```

### Task 3: Implement AI Micro-Analyst Service

**Files:**
- Create: `src/services/aiAnalyst.js`
- Create: `tests/aiAnalyst.test.js`

- [ ] **Step 1: Install Dependencies**
```bash
npm install @google/genai
```

- [ ] **Step 2: Write the failing test**
```javascript
// tests/aiAnalyst.test.js
const { analyzeTicker } = require('../src/services/aiAnalyst');

jest.mock('@google/genai', () => {
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      models: {
        generateContent: jest.fn().mockResolvedValue({ text: "Buy based on strong support." })
      }
    }))
  };
});

describe('AI Analyst Service', () => {
  it('should return analysis text for a specific ticker', async () => {
    const analysis = await analyzeTicker('AAPL', { shares: 100 }, 150.50);
    expect(analysis).toBe("Buy based on strong support.");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**
```bash
npm test tests/aiAnalyst.test.js
```
Expected: FAIL (Cannot find module)

- [ ] **Step 4: Write minimal implementation**
```javascript
// src/services/aiAnalyst.js
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'mock' });

async function analyzeTicker(ticker, portfolioData, livePrice) {
  const prompt = `Act as Elite Investor CIO. 
Ticker: ${ticker}
Verified Live Price: ${livePrice}
Portfolio Context: ${JSON.stringify(portfolioData)}

Provide a concise decision snapshot (Hold/Buy/Sell), Conviction Score, and brief reason based on Elite Investor SOP.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });
  
  return response.text;
}

module.exports = { analyzeTicker };
```

- [ ] **Step 5: Run test to verify it passes**
```bash
npm test tests/aiAnalyst.test.js
```
Expected: PASS

- [ ] **Step 6: Commit**
```bash
git add src/services/aiAnalyst.js tests/aiAnalyst.test.js package.json package-lock.json
git commit -m "feat: add ai micro-analyst service using gemini"
```

### Task 4: Expose Backend API Routes

**Files:**
- Create: `src/routes/api.js`
- Modify: `server.js`
- Create: `tests/api.test.js`

- [ ] **Step 1: Write the failing test**
```javascript
// tests/api.test.js
const request = require('supertest');
const express = require('express');
const apiRoutes = require('../src/routes/api');

// Mock dependencies
jest.mock('../src/services/marketData', () => ({ getLivePrice: jest.fn().mockResolvedValue(150.50) }));
jest.mock('../src/services/aiAnalyst', () => ({ analyzeTicker: jest.fn().mockResolvedValue("Hold") }));

const app = express();
app.use(express.json());
app.use('/api', apiRoutes);

describe('API Routes', () => {
  it('should return price and analysis on POST /api/analyze', async () => {
    const res = await request(app)
      .post('/api/analyze')
      .send({ ticker: 'AAPL', portfolioData: { shares: 10 } });
    
    expect(res.status).toBe(200);
    expect(res.body.price).toBe(150.50);
    expect(res.body.analysis).toBe("Hold");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
```bash
npm test tests/api.test.js
```
Expected: FAIL (Cannot find module)

- [ ] **Step 3: Write minimal implementation**
```javascript
// src/routes/api.js
const express = require('express');
const { getLivePrice } = require('../services/marketData');
const { analyzeTicker } = require('../services/aiAnalyst');

const router = express.Router();

router.post('/analyze', async (req, res) => {
  const { ticker, portfolioData } = req.body;
  try {
    const price = await getLivePrice(ticker);
    const analysis = await analyzeTicker(ticker, portfolioData, price);
    res.json({ ticker, price, analysis });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

**Step 3.1: Modify `server.js` to mount the API**
*(If using `sed` or editor, ensure you inject this after `app = express(); app.use(express.json());` but BEFORE `app.get(/.*/, ...)` static route catch-all)*

```javascript
// Add these to server.js
const apiRoutes = require('./src/routes/api');
app.use('/api', apiRoutes);
```

- [ ] **Step 4: Run test to verify it passes**
```bash
npm test tests/api.test.js
```
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/routes/api.js server.js tests/api.test.js
git commit -m "feat: add /api/analyze route integrating market data and ai"
```

### Task 5: Build Frontend Dashboard Component

**Files:**
- Modify: `frontend/src/App.jsx`
- Create: `frontend/src/Dashboard.jsx`

- [ ] **Step 1: Write the failing test**
*(Create a simple pure js unit test since testing-library might not be set up in vite template)*
```javascript
// tests/Dashboard.smoke.test.js
const fs = require('fs');
const path = require('path');

describe('Dashboard Component Check', () => {
  it('should exist and export default', () => {
    const filePath = path.join(__dirname, '../frontend/src/Dashboard.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).toContain('export default');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
```bash
npm test tests/Dashboard.smoke.test.js
```
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**
```jsx
// frontend/src/Dashboard.jsx
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
```

- [ ] **Step 4: Update App.jsx**
```jsx
// frontend/src/App.jsx
import Dashboard from './Dashboard';

function App() {
  return (
    <div>
      <Dashboard />
    </div>
  );
}

export default App;
```

- [ ] **Step 5: Run test to verify it passes**
```bash
npm test tests/Dashboard.smoke.test.js
```
Expected: PASS

- [ ] **Step 6: Commit**
```bash
git add frontend/src/App.jsx frontend/src/Dashboard.jsx tests/Dashboard.smoke.test.js
git commit -m "feat: build React dashboard with analyze function"
```
