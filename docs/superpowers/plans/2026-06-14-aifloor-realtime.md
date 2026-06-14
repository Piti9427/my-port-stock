# AIFloor Real-Time UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the static `/ai-floor` mock UI into a live visual interface that animates Pixel sprites and displays a real-time activity log driven by WebSocket events.

**Architecture:** The backend already broadcasts detailed state changes (`TYPING`, `WALKING`, `PRESENTING`) via WebSockets to `frontend/src/hooks/useAgentEvents.jsx`. The frontend `AIFloorPage.jsx` will consume this hook, render an overlay "Activity Log" panel, and apply PixiJS bobbing/glowing animations dynamically based on the current `agentStates`.

**Tech Stack:** React, PixiJS, WebSockets.

---

### Task 1: Setup Activity Log UI & State

**Files:**
- Create: `frontend/tests/AIFloorPage.test.jsx`
- Modify: `frontend/src/pages/AIFloorPage.jsx`

- [ ] **Step 1: Write the failing test**

```javascript
// frontend/tests/AIFloorPage.test.jsx
import { render, screen } from '@testing-library/react';
import AIFloorPage from '../src/pages/AIFloorPage';
import { AgentEventsProvider } from '../src/hooks/useAgentEvents';

test('renders activity log panel', () => {
  render(
    <AgentEventsProvider>
      <AIFloorPage />
    </AgentEventsProvider>
  );
  expect(screen.getByText('Activity Log')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- -t "renders activity log panel"`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Modify `frontend/src/pages/AIFloorPage.jsx` to import `useState`, `useEffect` and capture `lastEvent` to maintain a log array, and render the DOM overlay.

```jsx
// At the top of frontend/src/pages/AIFloorPage.jsx
import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { useAgentEvents } from '../hooks/useAgentEvents';

// ... (keep AGENT_CONFIG)

export default function AIFloorPage() {
  const containerRef = useRef(null);
  const appRef = useRef(null);
  const spritesRef = useRef({});
  const { agentStates, lastEvent } = useAgentEvents();
  
  // New state for Activity Log
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (lastEvent && lastEvent.message) {
      setLogs(prev => {
        const newLogs = [...prev, { time: new Date().toLocaleTimeString(), msg: lastEvent.message }];
        return newLogs.slice(-20); // Keep last 20 logs
      });
    }
  }, [lastEvent]);

  // ... (keep initPixi useEffect but wrap the return statement to include the panel)

  return (
    <div className="ai-floor-page" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      <div className="glass-panel" style={{ marginBottom: '16px', zIndex: 10 }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>AI Trading Floor</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Real-time view of agent activity and analysis processes.
        </p>
      </div>
      
      <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0 }}>
        {/* Canvas Container */}
        <div 
          className="glass-panel" 
          ref={containerRef} 
          style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}
        />
        
        {/* Activity Log Overlay */}
        <div className="glass-panel" style={{ width: '300px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Activity Log</h3>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {logs.map((log, i) => (
              <div key={i} style={{ fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)', marginRight: '8px' }}>[{log.time}]</span>
                <span>{log.msg}</span>
              </div>
            ))}
            {logs.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Waiting for activity...</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- -t "renders activity log panel"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/tests/AIFloorPage.test.jsx frontend/src/pages/AIFloorPage.jsx
git commit -m "feat: add real-time activity log panel to AI floor"
```

---

### Task 2: Implement Sprite Animations in PixiJS

**Files:**
- Modify: `frontend/src/pages/AIFloorPage.jsx`

- [ ] **Step 1: Write the failing test**

*(We cannot easily unit test PixiJS canvas loop interactions in JSDOM, so we will skip the test for this specific visual canvas hook and rely on manual verification).*

- [ ] **Step 2: Write minimal implementation**

Modify `AIFloorPage.jsx` to dynamically read from `agentStates` inside the PixiJS `ticker` loop to animate the Sprites. Note: React state values inside a `useEffect` closure can be stale, so we use a `ref` to keep the latest `agentStates` accessible inside the PixiJS loop.

```jsx
// Inside AIFloorPage component:
  const { agentStates, lastEvent } = useAgentEvents();
  const agentStatesRef = useRef(agentStates);

  // Keep ref updated
  useEffect(() => {
    agentStatesRef.current = agentStates;
  }, [agentStates]);

  useEffect(() => {
    // ... setup Pixi
    const app = new PIXI.Application();
    appRef.current = app;

    const initPixi = async () => {
      // ... app.init ...
      // ... load background and sprites ...
      
      // Animation loop
      let tick = 0;
      app.ticker.add(() => {
        tick += 0.1;
        const currentStates = agentStatesRef.current;
        
        for (const [id, sprite] of Object.entries(spritesRef.current)) {
          const state = currentStates[id]?.state || 'IDLE';
          
          if (state === 'TYPING' || state === 'PRESENTING') {
            // Bobbing animation for busy agents
            sprite.y = AGENT_CONFIG[id].y + Math.sin(tick) * 3;
            sprite.alpha = 1;
          } else if (state === 'WALKING') {
            sprite.y = AGENT_CONFIG[id].y + Math.sin(tick * 2) * 5;
            sprite.alpha = 1;
          } else {
            // Reset to default
            sprite.y = AGENT_CONFIG[id].y;
            sprite.alpha = 0.8;
          }
        }
      });
    };

    initPixi();

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true, texture: false, baseTexture: false });
      }
    };
  }, []); // Run once
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/AIFloorPage.jsx
git commit -m "feat: animate agent sprites on the AI floor based on websocket state"
```
