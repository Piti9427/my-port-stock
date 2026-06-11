# MyPortStock Skill Scope

## TL;DR

ใช้ skills เป็นตัวช่วยเฉพาะจุด ไม่ใช่ระบบตัดสินใจลงทุนแทน Orchestrator. สำหรับ MyPortStock v1 ให้ใช้ชุดหลัก 8 กลุ่ม: data/quote, backend/API, decision/risk, journal/memory, dashboard/UI, E2E verification, agent orchestration, และ cost/security guardrails.

หลักสำคัญ: skill ใดก็ตามที่แตะราคา หุ้น หรือคำแนะนำลงทุน ต้องอยู่ใต้ `Current Price Acceptance Gate`, `Verified Data Packet`, และ `trade_journal.md` เสมอ.

## Goal

เอกสารนี้เป็นกรอบเลือก skills สำหรับงาน MyPortStock เพื่อให้:

- เลือก skill ตามงาน ไม่เลือกจากความน่าสนใจ
- ลด false `Buy/Add`
- ไม่ให้ sub-agent หรือ skill ดึงราคาหุ้นเองโดยข้าม Orchestrator
- แยกงาน investment logic, engineering, UI, testing, และ observability ชัดเจน
- เตรียมทางไปสู่ dashboard / pixel-agent presentation layer โดยไม่กลายเป็น autonomous trading

## Diagnosis / Root Cause

ปัญหาหลักของการใช้ skills กับระบบลงทุนคือ skill marketplace มีหลายตัวที่ดูเกี่ยวกับ finance แต่คุณภาพและ install count ไม่เท่ากัน. ตัวอย่างที่เจอจาก `skills.sh` คือ `financial-analysis-agent` มี workflow finance โดยตรง แต่ install count ต่ำมากเมื่อเทียบกับ skills หลักยอดนิยม จึงไม่ควรใช้เป็น core decision authority.

อีกปัญหาคือ skills ด้าน scraping, dashboard, agent, หรือ automation อาจพาไปสู่การดึงข้อมูลเองหลายทาง ทำให้เกิด price conflict, stale data, หรือใช้ analyst target เป็น last price. สำหรับ MyPortStock ต้องล็อก architecture ว่า Orchestrator เป็นเจ้าของ current-data fetching เท่านั้น.

## Skill Selection Principles

1. ใช้ project-native rules ก่อน external skill เสมอ: `AGENTS.md`, `ELITE_INVESTOR_SOP.md`, `trade_journal.md`, `stock_portfolio.md`.
2. Skill ที่เกี่ยวกับ market data ต้องเป็น helper เท่านั้น ไม่ใช่ source of truth.
3. Skill ที่สร้าง dashboard ต้องแสดง `Data Quality` แยกจาก `Verdict`.
4. Skill ที่สร้าง agent loop ต้องมี cost cap, max iteration, timeout, และ kill switch.
5. Skill ที่มี install count ต่ำหรือ repo reputation ไม่ชัด ให้จัดเป็น experimental เท่านั้น.
6. ห้ามติดตั้ง skill ใหม่เข้า workflow production โดยไม่มี reason, source, risk, และ test gate.

## Recommended Skill Scope Matrix

| Priority | Skill | Source | Use For | Do Not Use For | Recommendation |
|---|---|---|---|---|---|
| P0 | `find-skills` | local / skills.sh discovery | ค้นและประเมิน skill ใหม่ | ติดตั้งโดยไม่ตรวจ install/source/stars | ใช้ทุกครั้งก่อนเพิ่ม skill |
| P0 | `alpha-vantage` | local installed | financial data API pattern, technical indicators, economic data exploration | bypass quote gate, paid dependency by default | ใช้เป็น reference/optional adapter |
| P0 | `backtesting-frameworks` | local installed | ออกแบบ backtest, avoid lookahead bias, strategy evaluation | live buy/sell verdict | ใช้เมื่อเริ่ม v2 scan/backtest |
| P0 | `backend-dev-guidelines` | local installed | Express routes, services, error handling, reliability | investment judgement | ใช้กับ backend changes ทุกชุดใหญ่ |
| P0 | `api-endpoint-builder` | local installed | REST API endpoint design and validation | price-source authority | ใช้กับ `/api/packet`, `/api/analyze`, future APIs |
| P0 | `api-security-best-practices` | local installed | input validation, rate limit, auth, API abuse prevention | portfolio scoring | ใช้ก่อนเปิด dashboard ให้ network อื่น |
| P0 | `e2e-testing-patterns` | local installed | dashboard critical-path tests, mobile layout checks | unit test replacement | ใช้หลัง UI เริ่มซับซ้อน |
| P0 | `runaway-guard` | local installed | AI/API cost caps, loop bounds, autonomous scan guardrails | market analysis itself | ใช้ก่อนทำ autonomous scan/alert |
| P1 | `frontend-design` | local installed | dashboard layout, information hierarchy, product polish | investment logic | ใช้กับ Dashboard / Pixel Agent UI |
| P1 | `baseline-ui` | local installed | typography, accessibility, layout anti-patterns | data quality decisions | ใช้เป็น UI quality gate |
| P1 | `analytics-tracking` | local installed | event taxonomy for dashboard usage and decision audit | tracking sensitive broker data | ใช้เมื่อมี user behavior/event logs |
| P1 | `analytics-product` | local installed | product metrics, funnels, decision inbox usage | investment return attribution alone | ใช้เมื่อ dashboard เริ่มมี workflow จริง |
| P1 | `agent-orchestrator` | local installed | mapping skills/sub-agents to tasks | letting agents fetch their own prices | ใช้เป็น coordination reference only |
| P1 | `ai-agents-architect` | local installed | agent boundaries, tools, memory, orchestration | autonomous trading | ใช้กับ v2 architecture planning |
| P1 | `agent-tool-builder` | local installed | designing safe tools for packet creation or chart context | broker execution tools in v1 | ใช้เมื่อเพิ่ม internal tools |
| P1 | `subagent-driven-development` | local installed | implementing large plans with spec/code reviews | investment council runtime | ใช้กับ engineering execution, not finance verdict |
| P1 | `production-code-audit` | local installed | code quality, performance, security scan | broad auto-refactor without tests | ใช้แบบ scoped review หลัง milestone |
| P2 | `skill-creator` | local installed | สร้าง custom MyPortStock skills | duplicate existing project docs | ใช้เมื่อ pattern ซ้ำมากพอ |
| P2 | `financial-analysis-agent` | external skills.sh | finance workflow inspiration | authoritative stock recommendation | Experimental only; low install count |
| P2 | `developing-with-streamlit` | external skills.sh | quick Python dashboard prototype | current Express dashboard replacement | Optional only if moving to Python prototype |
| P2 | `building-dashboards` | external skills.sh / Axiom | observability dashboard philosophy | investment UI directly | Use concepts, not required install |
| Avoid v1 | generic scraper skills | external | broad web extraction experiments | current price API, TradingView scraping | Avoid for v1 |

## MyPortStock Workflow Mapping

### 1. Current Data / Quote Gate

Use:

- `alpha-vantage` as adapter reference only
- `backend-dev-guidelines`
- `api-endpoint-builder`
- `api-security-best-practices`

Rules:

- Orchestrator fetches all current data.
- Quote adapters return normalized source metadata.
- No skill may turn analyst target, fair value, 52-week range, or search snippet into `last_price`.
- If two accepted sources conflict beyond threshold, fail closed to `INSUFFICIENT_DATA`.

### 2. Verified Data Packet

Use:

- `backend-dev-guidelines`
- `api-patterns`
- `agent-tool-builder`

Rules:

- Packet is the only input to sub-agents.
- Sub-agents must not perform independent source lookup.
- Missing fundamental, technical, or macro packet must be explicit: `INSUFFICIENT_DATA` or `PARTIAL_CONTEXT`.

### 3. Decision Engine / Risk Gate

Use:

- `backtesting-frameworks` for future strategy validation
- project SOP as primary authority
- `production-code-audit` for reviewing hard-gate correctness

Rules:

- No `Buy/Add` if price gate fails.
- No `Buy/Add` without hard stop, hard THB risk, and R/R >= `1:2`.
- Held/repeat ticker must review `trade_journal.md`.
- Any `INSUFFICIENT_DATA` caps practical verdict at `Wait` unless irrelevant to timeframe.

### 4. Dashboard / Pixel Agent

Use:

- `frontend-design`
- `baseline-ui`
- `e2e-testing-patterns`
- optionally dashboard design concepts from `building-dashboards`

Rules:

- Pixel Agent is presentation-only in v1.
- UI must show `Data Quality` separately from verdict.
- UI must not imply broker-confirmed price unless packet says so.
- Mobile layout must not overlap cards/buttons/text.

### 5. Autonomous Scan / Alert v2

Use:

- `runaway-guard`
- `ai-agents-architect`
- `agent-orchestrator`
- `agent-tool-builder`
- `analytics-tracking`

Rules:

- Define max tickers, max API calls, timeout, retry limit, and daily cost cap before coding.
- Scan result is `Candidate`, not `Buy`.
- Alert must link to packet, gate status, journal status, and risk plan.

## External Skill Findings

Checked `skills.sh` on 2026-06-05. Relevant observations:

- `find-skills` is a high-install discovery skill and should remain the default way to discover skills.
- `financial-analysis-agent` exists and covers yfinance, fundamentals, technical analysis, and risk management, but install count is low. Treat as idea/reference, not core authority.
- `developing-with-streamlit` is useful if we prototype Python dashboards, but current v1 is Express/static UI.
- `building-dashboards` has strong dashboard philosophy, but it targets Axiom observability workflows rather than investment decisions.
- Playwright/E2E skills are relevant for dashboard verification, but should stay thin and focused on critical flows.

## Options With Pros / Cons

| Option | Pros | Cons | Recommendation |
|---|---|---|---|
| Use only local installed skills | Low setup risk, works offline, aligns with current workspace | May miss new specialized finance skills | Recommended for v1 |
| Install external finance skill now | Faster access to finance examples | Low install count, possible stale or unsafe assumptions | Not recommended as core |
| Build custom MyPortStock skills | Fits exact SOP and risk gates | More maintenance | Recommended after patterns stabilize |
| Use generic scraper skills | Flexible data gathering | High risk of stale/current-price misuse | Avoid for v1 |

## Prevention Guidance

- Add any new skill to this scope file before using it in a durable workflow.
- Require a short reason before installing: task, source, install count, security/reputation, and rollback plan.
- Keep market-data responsibilities in code modules, not in free-form agent prompts.
- Add tests for every rule that can create false `Buy/Add`.
- Review `PROJECT_MEMORY_INDEX.md` before creating overlapping notes.

## Observability / Verification Steps

For every skill-assisted feature:

```text
[ ] Skill purpose is documented.
[ ] Skill cannot bypass Orchestrator price fetching.
[ ] Output includes source quality or explicitly says INSUFFICIENT_DATA.
[ ] Tests cover fail-closed behavior.
[ ] Dashboard separates Data Quality from verdict.
[ ] No autonomous loop exists without runaway/cost guard.
[ ] Held/repeat ticker path checks trade_journal.md.
```

## Actionable Next Steps

1. Use this document as the skill-selection gate for future MyPortStock work.
2. Keep v1 on local installed skills: backend, API, UI, testing, security, and runaway guard.
3. Do not install `financial-analysis-agent` as core until it is manually reviewed.
4. Create custom `myportstock-quote-gate`, `myportstock-decision-engine`, and `myportstock-dashboard-review` skills only after the current packet/gate implementation stabilizes.
5. Re-check `skills.sh` monthly or before a major v2 feature, because install counts and quality signals can change.
