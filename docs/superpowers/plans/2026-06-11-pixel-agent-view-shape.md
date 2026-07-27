---
status: Completed
updated_at: "2026-07-27"
owner: AI Agent / Developer
---

# Design Brief & Implementation Plan: Visual Trading Floor (Pixel Agent View)

## 1. Feature Summary
The Visual Trading Floor is a top-down, 2D pixel-art canvas that replaces the static "AI Agent Terminal". It renders the backend AI orchestration process as a live, physical office where the CIO sits at the head desk, and 5 sub-agents spawn, walk to their desks, and analyze data in real-time when a stock analysis is triggered.

## 2. Primary User Action
Watch the visual feedback of the multi-agent AI workflow executing in parallel, providing a tangible, engaging sense of the "Elite Investor Council" working on the user's behalf.

## 3. Design Direction
- **Color Strategy**: Restrained Corporate with glowing screen accents to match the "Dark Void" dashboard aesthetic.
- **Theme Scene**: A high-stakes, realistic hedge fund trading room under warm lighting, viewed from a top-down 2D grid perspective.
- **Anchor References**: Probe 2 (Active Symmetrical Floor), classic top-down RPG spatial logic, Bloomberg Terminals.
- **Probe Decision**: Probe 2 was selected for its strong symmetrical hierarchy, perfectly mapping to the Orchestrator (top) → Sub-agents (below) relationship.

## 4. Scope
- **Fidelity**: High-fi / Production-ready implementation.
- **Breadth**: A single isolated HTML5 Canvas/React component embedded inside the existing `DashboardPage.jsx` panel.
- **Interactivity**: Read-only visualizer. Characters animate based on WebSocket events from the backend. No direct user-controlled player movement required.

## 5. Layout Strategy
- **Spatial Map**: A rigid, symmetrical grid. The CIO desk is centered at the top wall with a massive multi-monitor setup. Below, desks are designated for the 5 sub-agents (`fundamental-auditor`, `quant-technician`, `macro-strategist`, `portfolio-risk-manager`, `catalyst-hunter`).
- **Entry Point**: A door at the bottom of the room where sub-agents spawn before pathfinding to their desks.

## 6. Key States
- **Idle**: Office is empty except for the CIO sitting at the top desk.
- **Analysis Triggered**: Sub-agents spawn at the door and walk to their respective desks.
- **Working**: Agents sit and loop a typing/thinking animation while their backend counterpart processes data.
- **Completed**: Agent gives a visual cue (e.g., screen flashes, or a small particle effect), then walks back to the door and despawns.

## 7. Interaction Model
The canvas acts as a pure state-renderer, listening to the `AgentEventBus` WebSocket:
- `SPAWNED` → Instantiate sprite at door.
- `WALKING` → Pathfind to desk coordinates.
- `TYPING` → Play typing animation loop.
- `PRESENTING` / `DONE` → Play success animation.
- `EXITED` → Pathfind to door and destroy instance.

## 8. Content Requirements
- **Sprites Needed**: CIO character, 5 sub-agent characters (can be one base sprite with palette swaps for V1), Office tileset (floor, walls), Desk with Bloomberg terminals.
- **Data**: Real-time agent status strings from the backend WebSocket (already implemented in Phase 1).

---

## Execution Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

### Task 1: Generate & Extract Pixel Art Assets
- [ ] Generate a top-down office tileset (floor, walls, desks, multi-monitor setups).
- [ ] Generate base character sprites (walking animation frames, sitting/typing frames) for the CIO and Sub-agents.
- [ ] Cut and save the sprites into `frontend/public/assets/sprites/`.

### Task 2: Build the Canvas Game Engine Foundation
- [ ] Create `frontend/src/components/PixelTradingFloor.jsx`.
- [ ] Implement a basic `requestAnimationFrame` loop that renders a grid map.
- [ ] Draw the background office tiles and static desks onto the canvas.

### Task 3: Implement Character Entities and State Machine
- [ ] Create a `Character` class or hook to manage X/Y position, current animation frame, and target destination.
- [ ] Implement basic linear interpolation (lerp) for pathfinding from the "door" to specific desk coordinates.
- [ ] Hardcode the desk coordinates for the 5 sub-agents.

### Task 4: Bind WebSocket Events to Animation States
- [ ] Connect the `PixelTradingFloor` component to the existing `AgentEventBus` WebSocket.
- [ ] When `AGENT_SPAWNED` is received, instantiate the character at the door.
- [ ] When `AGENT_WALKING` is received, set the target coordinate to their assigned desk.
- [ ] When `AGENT_TYPING` is received, switch to the typing sprite animation.
- [ ] When `AGENT_EXITED` is received, pathfind back to the door and unmount.

### Task 5: Final Polish & Dashboard Integration
- [ ] Replace the "Pixel Floor View Placeholder" in `DashboardPage.jsx` with the `<PixelTradingFloor />` component.
- [ ] Ensure the canvas scales correctly within the CSS Grid panel.
- [ ] Verify that the animations sync smoothly with the real analysis requests.
