# Implementation Plan: Command Center Redesign

## Task 1: Refactor Backend API (`backend/src/routes/api.js`)
- [ ] Create `/api/quote` endpoint (or use existing `/api/price/:ticker` and improve it) to fetch data *without* running the LLM.
- [ ] Ensure `/api/analyze` accepts the verified data packet or manual override price.

## Task 2: Create CommandCenter Frontend (`frontend/src/pages/CommandCenterPage.jsx`)
- [ ] Build the Left Pane: Live Data Feed (Search bar for Ticker, display current price, fundamentals).
- [ ] Build the Manual Price Override input field in the Left Pane.
- [ ] Build the Right Pane: AI Floor (Migrate `AIFloorPage.jsx` logic here).
- [ ] Add the Traffic-Light Dashboard at the top of the Right Pane.
- [ ] Add the action buttons at the Bottom Bar (Buy, Sell, Add to Watchlist).

## Task 3: Update Routing (`frontend/src/App.jsx`)
- [ ] Replace `AIFloorPage` with `CommandCenterPage` in the routing and navigation menu.

## Task 4: Verify and Test
- [ ] Run backend and frontend.
- [ ] Test fetching a ticker, overriding the price, and getting a verdict.
