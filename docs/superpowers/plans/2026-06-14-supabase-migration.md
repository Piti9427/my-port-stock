# Supabase Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the multi-tenant portfolio data fetching logic so the Vite React frontend authenticates via Clerk, reads securely from Supabase, and the backend Express server queries Supabase instead of local markdown files.

**Architecture:** 
1. The frontend authenticates users with Clerk and uses the Clerk JWT to instantiate a Supabase client. This enforces Row Level Security (RLS).
2. The frontend fetches its own portfolio data securely.
3. The AI agent backend (Express) is updated to receive the `user_id` and query Supabase using the service role key (or passes the JWT) instead of parsing local `.md` files.

**Tech Stack:** React (Vite), Clerk (`@clerk/clerk-react`), Supabase (`@supabase/supabase-js`), Node.js native test runner (backend), Vitest (frontend).

---

### Task 1: Setup Frontend Testing

**Files:**
- Create: `frontend/vitest.config.js`
- Modify: `frontend/package.json`
- Create: `frontend/tests/setup.js`

- [ ] **Step 1: Install testing dependencies**
```bash
cd frontend && npm install -D vitest @testing-library/react @testing-library/dom @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Add test script to package.json**
Modify `frontend/package.json` to add `"test": "vitest run"` under scripts.

- [ ] **Step 3: Create Vitest config**
```javascript
// frontend/vitest.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
  },
});
```

- [ ] **Step 4: Create setup file**
```javascript
// frontend/tests/setup.js
import '@testing-library/jest-dom';
```

- [ ] **Step 5: Commit**
```bash
git add frontend/package.json frontend/vitest.config.js frontend/tests/setup.js
git commit -m "chore: setup vitest for frontend"
```

### Task 2: Implement Supabase Client with Clerk Token

**Files:**
- Create: `frontend/src/lib/supabase.js`
- Create: `frontend/tests/supabase.test.js`

- [ ] **Step 1: Write the failing test**
```javascript
// frontend/tests/supabase.test.js
import { expect, test, vi } from 'vitest';
import { createSupabaseClient } from '../src/lib/supabase.js';

test('createSupabaseClient creates a client with the provided token', () => {
  const client = createSupabaseClient('test-token');
  expect(client).toBeDefined();
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `cd frontend && npm run test`
Expected: FAIL with "createSupabaseClient is not defined" or similar.

- [ ] **Step 3: Write minimal implementation**
```javascript
// frontend/src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

export function createSupabaseClient(clerkToken) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${clerkToken}` } }
  });
}
```

- [ ] **Step 4: Run test to verify it passes**
Run: `cd frontend && npm run test`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add frontend/src/lib/supabase.js frontend/tests/supabase.test.js
git commit -m "feat: implement clerk-authenticated supabase client factory"
```

### Task 3: Backend Data Fetching Update

**Files:**
- Create: `backend/src/db.js`
- Create: `backend/tests/db.test.js`

- [ ] **Step 1: Write the failing test**
```javascript
// backend/tests/db.test.js
import test from 'node:test';
import assert from 'node:assert';
import { getUserHoldings } from '../src/db.js';

test('getUserHoldings should be a function', () => {
  assert.strictEqual(typeof getUserHoldings, 'function');
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `cd backend && npm run test`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**
```javascript
// backend/src/db.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://placeholder', 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
);

export async function getUserHoldings(userId) {
  if (!userId) throw new Error('User ID is required');
  const { data, error } = await supabase
    .from('holdings')
    .select('*')
    .eq('user_id', userId);
    
  if (error) throw error;
  return data;
}
```

- [ ] **Step 4: Run test to verify it passes**
Run: `cd backend && npm run test`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add backend/src/db.js backend/tests/db.test.js
git commit -m "feat: add supabase data fetching layer to replace markdown parsing"
```
