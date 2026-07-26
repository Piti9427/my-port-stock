# Pixel Agent Integration — Architecture & UI Specification

> Derived from `/grill-me` session on 2026-06-10 and [PIXEL_AGENT_INTEGRATION_CONCEPT.md](file:///Users/nopparuj/my-agents/MyPortStock/docs/PIXEL_AGENT_INTEGRATION_CONCEPT.md).

---

## 1. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     React + Vite SPA                         │
│                                                              │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ Dashboard │  │  AI Floor    │  │      Journal           │ │
│  │  (Tab 1)  │  │  (Tab 2)     │  │      (Tab 3)           │ │
│  │           │  │              │  │                        │ │
│  │ Portfolio │  │ ┌──────────┐ │  │ Trade log, post-mortem │ │
│  │ Watchlist │  │ │ Canvas   │ │  │ history, performance   │ │
│  │ AI Verdict│  │ │ (PixiJS) │ │  │ charts                 │ │
│  │ Scenario  │  │ │ Trading  │ │  │                        │ │
│  │ Planner   │  │ │ Floor    │ │  │                        │ │
│  │ (Drawer)  │  │ └──────────┘ │  │                        │ │
│  │           │  │ ┌──────────┐ │  │                        │ │
│  │           │  │ │ React    │ │  │                        │ │
│  │           │  │ │ Overlay  │ │  │                        │ │
│  │           │  │ │ (Glass   │ │  │                        │ │
│  │           │  │ │  Bubbles)│ │  │                        │ │
│  │           │  │ └──────────┘ │  │                        │ │
│  └──────────┘  └──────────────┘  └────────────────────────┘ │
│                        │                                     │
│              WebSocket Connection                            │
│                        │                                     │
└────────────────────────┼─────────────────────────────────────┘
                         │
          ┌──────────────┴──────────────┐
          │      Express Backend        │
          │                             │
          │  ┌───────────────────────┐  │
          │  │  WebSocket Server     │  │
          │  │  (Agent Event Bus)    │  │
          │  └───────────────────────┘  │
          │  ┌───────────────────────┐  │
          │  │  REST API             │  │
          │  │  /api/quote, /analyze │  │
          │  └───────────────────────┘  │
          │  ┌───────────────────────┐  │
          │  │  AI Pipeline          │  │
          │  │  (Gemini Multi-Agent) │  │
          │  └───────────────────────┘  │
          │             │               │
          │      Supabase (PG)          │
          └─────────────────────────────┘
```

---

## 2. Tab / Page Routing

| Route          | Tab Label   | Content                                         |
|----------------|-------------|--------------------------------------------------|
| `/`            | Dashboard   | Portfolio overview, Watchlist, AI Verdict, Scenario Planner (Drawer) |
| `/ai-floor`   | AI Floor    | Pixel Art Trading Floor (Canvas + Overlay)       |
| `/journal`     | Journal     | Trade log, post-mortem archive, performance chart |

**Rationale (from user choice):** Separating "data view" from "visual view" keeps the Dashboard clean and data-dense while giving the Pixel Agent Floor its own full-screen immersive space.

---

## 3. WebSocket Event Protocol

### 3.1 Connection

```
ws://localhost:8080/ws/agent-events
```

Backend upgrades the Express HTTP server to support `ws`. Each connected frontend client receives real-time agent lifecycle events.

### 3.2 Event Schema (Server → Client)

```typescript
interface AgentEvent {
  type: 'AGENT_STATE_CHANGE' | 'ANALYSIS_PROGRESS' | 'ANALYSIS_COMPLETE';
  timestamp: string;           // ISO 8601
  ticker?: string;             // e.g. "NVDA"
  agent: AgentId;              // see §4
  state: AgentState;           // see §3.3
  message?: string;            // e.g. "Evaluating Q3 earnings..."
  payload?: Record<string, unknown>; // flexible data
}

type AgentId =
  | 'cio'
  | 'fundamental-auditor'
  | 'quant-technician'
  | 'macro-strategist'
  | 'portfolio-risk-manager'
  | 'catalyst-hunter';

type AgentState =
  | 'IDLE'
  | 'SPAWNED'
  | 'WALKING'
  | 'SITTING'
  | 'TYPING'
  | 'READING'
  | 'PRESENTING'  // thumbs up / showing verdict
  | 'DONE'
  | 'EXITED';
```

### 3.3 State Machine (per Agent)

```
IDLE → SPAWNED → WALKING → SITTING → TYPING ↔ READING → PRESENTING → DONE → EXITED → IDLE
                                                                        │
                                                              (CIO stays IDLE, never EXITED)
```

### 3.4 Example Event Flow (User clicks "Run AI Analysis" for NVDA)

```jsonl
{"type":"AGENT_STATE_CHANGE","agent":"cio","state":"TYPING","ticker":"NVDA","message":"Dispatching sub-agents..."}
{"type":"AGENT_STATE_CHANGE","agent":"fundamental-auditor","state":"SPAWNED","ticker":"NVDA"}
{"type":"AGENT_STATE_CHANGE","agent":"quant-technician","state":"SPAWNED","ticker":"NVDA"}
{"type":"AGENT_STATE_CHANGE","agent":"macro-strategist","state":"SPAWNED","ticker":"NVDA"}
{"type":"AGENT_STATE_CHANGE","agent":"fundamental-auditor","state":"WALKING"}
{"type":"AGENT_STATE_CHANGE","agent":"fundamental-auditor","state":"SITTING"}
{"type":"AGENT_STATE_CHANGE","agent":"fundamental-auditor","state":"TYPING","message":"Reviewing NVDA Q3 earnings..."}
{"type":"ANALYSIS_PROGRESS","agent":"fundamental-auditor","ticker":"NVDA","payload":{"score":8.2,"summary":"Strong moat..."}}
{"type":"AGENT_STATE_CHANGE","agent":"fundamental-auditor","state":"PRESENTING"}
{"type":"AGENT_STATE_CHANGE","agent":"fundamental-auditor","state":"DONE"}
{"type":"AGENT_STATE_CHANGE","agent":"fundamental-auditor","state":"EXITED"}
...
{"type":"ANALYSIS_COMPLETE","agent":"cio","ticker":"NVDA","payload":{"verdict":"Strong Buy","score":7.8}}
{"type":"AGENT_STATE_CHANGE","agent":"cio","state":"PRESENTING","message":"Verdict: Strong Buy (7.8)"}
```

---

## 4. Agent Roster & Visual Identity

| Agent ID                 | Display Name          | Desk Position | Sprite Theme             | Trigger                              |
|--------------------------|-----------------------|---------------|--------------------------|--------------------------------------|
| `cio`                    | CIO (Orchestrator)    | Center desk   | Black suit, gold tie     | Always present                       |
| `fundamental-auditor`    | Fundamental Auditor   | Desk #1 (L)   | Navy suit, briefcase     | `Swing`, `Core`, `Exit Review`       |
| `quant-technician`       | Quant Technician      | Desk #2 (R)   | Gray suit, chart tablet  | `Quick`, `Swing`, exit/trim          |
| `macro-strategist`       | Macro Strategist      | Desk #3 (BL)  | Blue suit, globe icon    | Macro/theme/flow driven thesis       |
| `portfolio-risk-manager` | Risk Manager          | Desk #4 (BR)  | White shirt, calculator  | All `Buy/Add` decisions              |
| `catalyst-hunter`        | Catalyst Hunter       | Desk #5 (TL)  | Vest + headset           | `Quick Trade`, `Swing Trade`         |

**CIO Special Rule:** The CIO character is always seated and never exits. Other agents follow the full state machine lifecycle (spawn → walk in → work → present → walk out).

---

## 5. Rendering Architecture (Hybrid: Canvas + React DOM)

### 5.1 Canvas Layer (PixiJS)

Handles:
- Tilemap rendering (the Trading Floor background with Bloomberg terminals, desks, etc.)
- Agent sprite rendering (walking, typing, idle animations via sprite sheets)
- Pathfinding (A* or simple waypoint system for agents walking to their desk)

```
frontend/src/
├── ai-floor/
│   ├── PixiApp.jsx            # PixiJS application wrapper (React ↔ Pixi bridge)
│   ├── TradingFloorScene.js   # Tilemap loader, desk positions, floor layout
│   ├── AgentSprite.js         # Sprite class with state machine animations
│   ├── AgentManager.js        # Manages all 6 agents, handles WebSocket events
│   ├── Pathfinder.js          # Simple A* or waypoint pathfinding
│   └── assets/
│       ├── tilemap.json       # Floor tilemap
│       ├── cio.png            # Sprite sheet
│       ├── fundamental.png
│       ├── quant.png
│       ├── macro.png
│       ├── risk.png
│       └── catalyst.png
```

### 5.2 React DOM Overlay Layer

Handles:
- Speech bubbles (glassmorphic `bg-panel` with `backdrop-filter: blur`)
- Agent name tags
- Status bar showing which agents are active
- Progress indicators ("Analyzing NVDA... 2/3 agents complete")
- The final verdict card overlay when analysis is complete

```
frontend/src/
├── ai-floor/
│   ├── AgentOverlay.jsx       # Positioned absolutely over Canvas
│   ├── SpeechBubble.jsx       # Glass speech bubble component
│   ├── AgentStatusBar.jsx     # Shows active agents and their states
│   └── VerdictOverlay.jsx     # Full verdict card when analysis completes
```

### 5.3 Layering (CSS z-index)

```
z-index: 0   — Canvas (PixiJS Trading Floor)
z-index: 10  — React DOM Overlay (Speech Bubbles, Name Tags)
z-index: 20  — React DOM UI (Status Bar, Verdict Overlay)
z-index: 30  — React DOM Navigation (Tab Bar)
```

---

## 6. Frontend Component Tree

```
<App>
  <TabNavigation />          ← Dashboard | AI Floor | Journal
  <Routes>
    <Route path="/" element={<DashboardPage />} />
    <Route path="/ai-floor" element={<AIFloorPage />} />
    <Route path="/journal" element={<JournalPage />} />
  </Routes>
</App>

<DashboardPage>
  <Header />                 ← Portfolio Value, P/L, Cash
  <WatchlistPanel />         ← Glassmorphic ticker table
  <AITerminalPanel />        ← Ticker search, Run Analysis button, Verdict Card
  <ScenarioPlannerDrawer />  ← Side panel (slide-out)
</DashboardPage>

<AIFloorPage>
  <PixiApp />                ← Canvas: TradingFloorScene + AgentSprites
  <AgentOverlay />           ← React DOM: SpeechBubbles + NameTags
  <AgentStatusBar />         ← React DOM: Active agent indicators
  <VerdictOverlay />         ← React DOM: Final verdict card (conditional)
</AIFloorPage>

<JournalPage>
  <TradeLogTable />
  <PostMortemList />
  <PerformanceChart />
</JournalPage>
```

---

## 7. Backend Changes Required

### 7.1 WebSocket Server (`backend/src/ws/agentEventBus.js`)

```javascript
// New module: WebSocket event bus
const WebSocket = require('ws');

function createAgentEventBus(httpServer) {
  const wss = new WebSocket.Server({ server: httpServer, path: '/ws/agent-events' });

  function broadcast(event) {
    const payload = JSON.stringify(event);
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  return { wss, broadcast };
}
```

### 7.2 Integration with AI Pipeline

When the `/api/analyze` endpoint triggers the multi-agent pipeline, each step emits events via `broadcast()`:

```javascript
// In the analyze handler:
broadcast({ type: 'AGENT_STATE_CHANGE', agent: 'cio', state: 'TYPING', ticker });
broadcast({ type: 'AGENT_STATE_CHANGE', agent: 'fundamental-auditor', state: 'SPAWNED', ticker });
// ... run fundamental analysis ...
broadcast({ type: 'ANALYSIS_PROGRESS', agent: 'fundamental-auditor', ticker, payload: result });
broadcast({ type: 'AGENT_STATE_CHANGE', agent: 'fundamental-auditor', state: 'DONE' });
```

### 7.3 New Dependencies

| Package    | Purpose                    | Install Command      |
|------------|----------------------------|----------------------|
| `ws`       | WebSocket server           | `npm i ws`           |
| `pixi.js`  | Canvas rendering (frontend)| In frontend package  |

---

## 8. Asset Pipeline

Custom pixel art assets will be generated using the `generate_image` AI tool:

| Asset                  | Description                              | Size     |
|------------------------|------------------------------------------|----------|
| `trading_floor.png`    | Top-down tilemap: dark floor, Bloomberg terminals, 6 desks | 640x480 |
| `cio.png`              | 4-direction sprite sheet (idle, walk, type, present) | 128x128 |
| `fundamental.png`      | Navy suit character sprite sheet         | 128x128  |
| `quant.png`            | Gray suit character sprite sheet         | 128x128  |
| `macro.png`            | Blue suit character sprite sheet         | 128x128  |
| `risk.png`             | White shirt character sprite sheet       | 128x128  |
| `catalyst.png`         | Vest + headset character sprite sheet    | 128x128  |

---

## 9. Implementation Phases

### Phase 1: Foundation (WebSocket + Tab Routing)
- [ ] Add `react-router-dom` to frontend
- [ ] Create 3 tab pages: Dashboard, AI Floor (placeholder), Journal (placeholder)
- [ ] Add `ws` to backend, create `agentEventBus.js`
- [ ] Wire WebSocket into `/api/analyze` to emit basic lifecycle events
- [ ] Create `useAgentEvents()` React hook for consuming WebSocket events

### Phase 2: Pixel Art Floor (Canvas)
- [ ] Install `pixi.js` in frontend
- [ ] Create `PixiApp.jsx` as React-Pixi bridge
- [ ] Build `TradingFloorScene` with placeholder tilemap
- [ ] Implement `AgentSprite` with state machine (idle → walk → type → present → exit)
- [ ] Create `AgentManager` that listens to WebSocket events and drives sprites

### Phase 3: Glass Overlay (React DOM)
- [ ] Build `SpeechBubble.jsx` (glassmorphic, positioned over agent)
- [ ] Build `AgentStatusBar.jsx` (shows active agents with colored indicators)
- [ ] Build `VerdictOverlay.jsx` (final verdict display, reuses AI Verdict Card from Dashboard)

### Phase 4: Custom Assets
- [ ] Generate trading floor tilemap with `generate_image`
- [ ] Generate 6 character sprite sheets
- [ ] Import and bind to PixiJS sprite classes

### Phase 5: Polish
- [ ] Add sound effects (optional: keyboard typing, notification chime)
- [ ] Add smooth transitions between tabs
- [ ] Performance optimization (sprite pooling, off-screen culling)
