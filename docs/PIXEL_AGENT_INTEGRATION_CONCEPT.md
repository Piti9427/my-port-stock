# 🎮 Pixel Agents x Elite Investor Council (Integration Concept)

## 🎯 The Vision
Transform the underlying terminal-based AI workflow into a **Visual Trading Floor**. Instead of just waiting for text responses, the user will see a top-down pixel-art office where the Orchestrator (CIO) and the 5 Sub-Agents are actively working, moving around, and analyzing data in real-time.

## 🧩 How Pixel Agents Works (The Baseline)
1. **The Game Engine**: A VS Code Webview running a lightweight 2D canvas game loop (React + Vite).
2. **The Watcher**: It monitors a specific folder for `transcript.jsonl` files (currently hardcoded for Claude Code).
3. **The Brain**: When the JSONL file updates (e.g., agent calls a tool or outputs text), the character's state machine changes (Idle ➡️ Walk ➡️ Type/Read).

## 🚀 Adaptation Strategy (How we make it ours)
Since Pixel Agents is open-source (MIT), we don't need to build the game engine from scratch. We only need to build a "Bridge" (Adapter) between our system and their game.

### 1. The Data Adapter (Gemini to Pixel)
* **Decision**: We will write a native **TypeScript Adapter** injected directly into the extension's source code. This adapter will natively understand the Antigravity `transcript.jsonl` structure, ensuring long-term stability without needing messy Python background scripts.

### 2. The Character Animation Logic
* **Decision**: **"Walk-in on Command"**. The CIO (Main Agent) will remain seated at the main desk. The office will normally look empty. When a sub-agent is invoked via the `invoke_subagent` tool, their designated character will spawn, walk into the room, sit at their specialized desk, perform their typing animation, and give a "Thumbs Up" before leaving when their task is done.

### 3. Custom Assets (The Hedge Fund Trading Floor)
* **Decision**: We will not use the boring startup assets. I will use the `generate_image` AI tool to create custom 2D Pixel Art sprites for:
  - Bloomberg Terminals (Multiple vertical screens).
  - Trading Desk setups.
  - Characters wearing Finance Suits / Tuxedos.

## 🚧 Roadmap & Execution Plan
1. **Phase 1: Adapter Construction** - Edit the extension's code (`tmp/pixel-agents`) to build the Gemini log parser.
2. **Phase 2: Animation Binding** - Link the `invoke_subagent` event to the character spawning and pathfinding logic.
3. **Phase 3: Asset Generation** - Generate and import the new Trading Floor pixel assets.
