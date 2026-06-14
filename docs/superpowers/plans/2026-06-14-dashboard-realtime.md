# Dashboard & Watchlist Data Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mock data in Dashboard and Watchlist pages with real data fetched from the Express Backend, which securely aggregates Supabase database rows and live Yahoo Finance market data using Clerk Authentication.

**Architecture:** 
1. **Auth:** `@clerk/clerk-react` installed on Frontend, `@clerk/express` installed on Backend. Frontend passes JWT to backend.
2. **Backend (Gateway):** `api.js` exposes `/holdings` and `/watchlists`. It verifies the user, queries the Supabase `db.js` layer, then fetches live quotes and cached sparklines from `yahoo-finance2` before sending a merged payload to the frontend.
3. **Frontend (React):** `DashboardPage.jsx` and `WatchlistPage.jsx` use `useEffect` and the Clerk `getToken()` to securely fetch data and show loading states.

**Tech Stack:** React, Express, Supabase (Service Role), Clerk, Yahoo Finance 2.

---

### Task 1: Backend Authentication Setup

**Files:**
- Modify: `backend/package.json`
- Modify: `backend/server.js`

- [ ] **Step 1: Install `@clerk/express`**

```bash
cd backend && npm install @clerk/express
```

- [ ] **Step 2: Add Clerk Middleware to Express**

Modify `backend/server.js` to import and apply `clerkMiddleware`. Add this right after `app.use(express.json())`.

```javascript
// At the top with other requires
const { clerkMiddleware } = require('@clerk/express');

// ... below app.use(express.json(...))
app.use(clerkMiddleware());
```

- [ ] **Step 3: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/server.js
git commit -m "feat: setup clerk middleware in backend"
```

---

### Task 2: Build Backend Data Endpoints

**Files:**
- Modify: `backend/src/routes/api.js`
- Modify: `backend/src/db.js`

- [ ] **Step 1: Update `db.js` to support Watchlists**

Modify `backend/src/db.js` to export a new function `getUserWatchlists`.

```javascript
// Add to backend/src/db.js
export async function getUserWatchlists(userId) {
  if (!userId) throw new Error('User ID is required');
  const { data, error } = await supabase
    .from('watchlists')
    .select('*')
    .eq('user_id', userId);
    
  if (error) throw error;
  return data;
}
```

- [ ] **Step 2: Create Sparkline Cache in `api.js`**

Modify `backend/src/routes/api.js` to include a simple in-memory cache for sparklines and the new endpoints.

```javascript
// Add to backend/src/routes/api.js
const { requireAuth } = require('@clerk/express');
const { getUserHoldings, getUserWatchlists } = require('../db');
const { default: YahooFinance } = require('yahoo-finance2');

// Simple sparkline cache
const sparklineCache = new Map();
const SPARKLINE_TTL = 60 * 60 * 1000; // 1 hour

async function getSparkline(ticker) {
  const now = Date.now();
  if (sparklineCache.has(ticker)) {
    const cached = sparklineCache.get(ticker);
    if (now - cached.timestamp < SPARKLINE_TTL) return cached.data;
  }
  try {
    const period1 = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const res = await YahooFinance.historical(ticker, { period1, interval: '1d' });
    const data = res.map(r => r.close);
    sparklineCache.set(ticker, { timestamp: now, data });
    return data;
  } catch (e) {
    return [0, 0];
  }
}

async function enrichWithMarketData(items) {
  return Promise.all(items.map(async (item) => {
    try {
      const quote = await YahooFinance.quote(item.ticker);
      const spark = await getSparkline(item.ticker);
      return {
        ...item,
        price: quote.regularMarketPrice,
        change: quote.regularMarketChange,
        changePct: quote.regularMarketChangePercent,
        spark
      };
    } catch (e) {
      return { ...item, price: 0, change: 0, changePct: 0, spark: [] };
    }
  }));
}

// Routes
router.get('/holdings', requireAuth(), async (req, res) => {
  try {
    const holdings = await getUserHoldings(req.auth.userId);
    const enriched = await enrichWithMarketData(holdings);
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/watchlists', requireAuth(), async (req, res) => {
  try {
    const watchlists = await getUserWatchlists(req.auth.userId);
    const enriched = await enrichWithMarketData(watchlists);
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/api.js backend/src/db.js
git commit -m "feat: build real-time holdings and watchlists endpoints with yahoo finance caching"
```

---

### Task 3: Frontend Clerk Setup

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/src/main.jsx`
- Create: `frontend/src/lib/api.js`

- [ ] **Step 1: Install Clerk React**

```bash
cd frontend && npm install @clerk/clerk-react
```

- [ ] **Step 2: Wrap Application in ClerkProvider**

Modify `frontend/src/main.jsx` to include `<ClerkProvider>`. Use a dummy publishable key fallback for local dev if missing.

```javascript
// frontend/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { ClerkProvider } from '@clerk/clerk-react';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "pk_test_placeholder";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <App />
    </ClerkProvider>
  </React.StrictMode>,
);
```

- [ ] **Step 3: Create API Client Helper**

Create `frontend/src/lib/api.js` to standardize fetching.

```javascript
// frontend/src/lib/api.js
export async function fetchWithAuth(url, getToken) {
  const token = await getToken();
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('API Error');
  return res.json();
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/main.jsx frontend/src/lib/api.js
git commit -m "feat: setup clerk provider and secure api client on frontend"
```

---

### Task 4: Replace Mocks in Dashboard & Watchlist UI

**Files:**
- Modify: `frontend/src/pages/DashboardPage.jsx`
- Modify: `frontend/src/pages/WatchlistPage.jsx`

- [ ] **Step 1: Update DashboardPage**

Remove the `const WATCHLIST` array. Import `useEffect`, `useState`, `useAuth` from `@clerk/clerk-react`, and `fetchWithAuth`.

```javascript
// In frontend/src/pages/DashboardPage.jsx
import { useAuth } from '@clerk/clerk-react';
import { fetchWithAuth } from '../lib/api';

// Inside DashboardPage component:
const { getToken } = useAuth();
const [watchlist, setWatchlist] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetchWithAuth('/api/holdings', getToken)
    .then(data => setWatchlist(data))
    .catch(err => console.error(err))
    .finally(() => setLoading(false));
}, [getToken]);

// Modify the table mapping to use `watchlist` state instead of constant.
// Handle loading state gracefully.
```

- [ ] **Step 2: Update WatchlistPage**

Remove `INITIAL_WATCHLIST` array. Use the same fetching pattern.

```javascript
// In frontend/src/pages/WatchlistPage.jsx
import { useAuth } from '@clerk/clerk-react';
import { fetchWithAuth } from '../lib/api';

// Inside WatchlistPage component:
const { getToken } = useAuth();
const [watchlist, setWatchlist] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetchWithAuth('/api/watchlists', getToken)
    .then(data => setWatchlist(data))
    .catch(err => console.error(err))
    .finally(() => setLoading(false));
}, [getToken]);

// Map over watchlist state. Remove dependencies on INITIAL_WATCHLIST.
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/DashboardPage.jsx frontend/src/pages/WatchlistPage.jsx
git commit -m "feat: wire up dashboard and watchlist to real backend API"
```
