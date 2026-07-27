---
status: Stable
audience: Human Developer & AI Agent
associated_adr: file:///Users/nopparuj/my-agents/MyPortStock/docs/adr/0001-supabase-runtime-source-of-truth.md
primary_tests: "npm run check:docs"
---

# MyPortStock Tool Integration & Directory Registry

สารบัญและบันทึกสถาปัตยกรรมลงทะเบียนโฟลเดอร์เครื่องมือ (Tool-Specific Directories) ทั้งหมดในโปรเจกต์ MyPortStock

---

## 🏛️ สถาปัตยกรรม Hub & Spoke

โปรเจกต์ MyPortStock มีการใช้งาน AI Tools และ Agent Plugins หลากหลายชนิด (Antigravity CLI / Gemini, Cursor IDE, Codex, Claude Code, Superpowers, Impeccable ฯลฯ) เพื่อให้การทำงานมีประสิทธิภาพสูงสุดและไม่เกิดกฎขัดแย้งกัน (Rule Drift) เราใช้สถาปัตยกรรมดังนี้:

1. **Single Source of Truth (SOT) ที่ Root & `docs/`:**
   กฎการตัดสินใจการลงทุน กฎการเขียนโค้ด และ SOP ทั้งหมด ถูกกำหนดไว้อย่างเป็นทางการที่ Root (`AGENTS.md`, `ELITE_INVESTOR_SOP.md`, `INVESTMENT_CIO_PERSONA.md`) และ `docs/`
2. **Tool-Specific Directories เป็น Thin Adapters / Engine States:**
   โฟลเดอร์สำหรับแต่ละเครื่องมือบน Disk เช่น `.agents/`, `.claude/`, `.codex/`, `.cursor/` มีหน้าที่เป็นเพียง **Thin Adapter Pointers** ที่อ้างอิงกลับมายัง `AGENTS.md` และจะไม่เขียนกฎซ้ำซ้อน
3. **Engine State & Cache Isolation:**
   โฟลเดอร์เก็บแคชหรือรายงานของเครื่องมือ เช่น `.superpowers/`, `.impeccable/`, `.codegraph/` จะคงอยู่ที่ Root ตามข้อตกลงของ Binary CLI (Tool Contracts) โดยไม่ปะปนกับซอร์สโค้ด

---

## 📊 Tool & Directory Classification Matrix

| Directory | Type | Tracked in Git? | Primary Purpose & Contract | Source of Truth Link |
|---|:---:|:---:|---|---|
| `AGENTS.md` | **SOT** | ✅ Yes | Master execution rules, Read Order, Scoring Math | Root Sovereign Rule |
| `ELITE_INVESTOR_SOP.md` | **SOT** | ✅ Yes | 7-Dimension SOP & Investment gates | Root Sovereign Rule |
| `INVESTMENT_CIO_PERSONA.md` | **SOT** | ✅ Yes | CIO debate stance, Devil's Advocate, tone rules | Root Sovereign Rule |
| `PROJECT_MEMORY_INDEX.md` | **SOT** | ✅ Yes | Active log of durable session memories | Root Sovereign Rule |
| `docs/` | **SOT** | ✅ Yes | Project architecture, plans, ADRs, and guidelines | Root Sovereign Rule |
| `docs/superpowers/plans/` | **Plugin Plans** | ✅ Yes | Superpowers plugin plan location (`writing-plans`, `executing-plans`) | Superpowers CLI contract |
| `.agents/` | **Adapter** | ✅ Yes | Antigravity CLI entrypoint adapter | Points to `AGENTS.md` |

| `.claude/` | **Adapter** | ✅ Yes | Claude Code CLI entrypoint adapter | Points to `AGENTS.md` |
| `.codex/` | **Adapter** | ✅ Yes | Codex CLI entrypoint adapter | Points to `AGENTS.md` |
| `.cursor/` | **Adapter** | ✅ Yes | Cursor IDE MDC rules adapter (`.cursor/rules/`) | Points to `AGENTS.md` |
| `.gemini/` | **Engine State** | ✅ Yes | Antigravity CLI settings & subagent specs | Configures runner |
| `.superpowers/` | **Engine State** | ⚠️ Partial | Superpowers plugin logs & brainstorm state | Plugin CLI contract |
| `.impeccable/` | **Engine State** | ✅ Yes | UI critique backlog & audit snapshots | Refers to `docs/architecture/DESIGN.md` |
| `.codegraph/` | **Cache** | ❌ Gitignored | Local symbol graph index cache | Local build cache |
| `.husky/` | **Git Hook** | ✅ Yes | Pre-commit security & format hooks | Enforces `check:secrets:staged` |

---

## 💡 Guidelines for Adding New Agent Tools

เมื่อมีการติดตั้งเครื่องมือหรือปลั๊กอินใหม่ในโปรเจกต์:

1. **ห้ามสร้างกฎหลักซ้ำซ้อนในโฟลเดอร์เครื่องมือ:** ให้สร้างเพียงไฟล์ Thin Adapter Pointer (3-5 บรรทัด) ชี้กลับมาที่ root `AGENTS.md`
2. **ลงทะเบียนในไฟล์นี้:** เพิ่มแถวใหม่ในตาราง Classification Matrix ด้านบน
3. **ตรวจสอบผ่าน CI:** รัน `npm run check:docs` เพื่อยืนยันว่าโฟลเดอร์ใหม่ปฏิบัติตามมาตรฐานโปรเจกต์

---

## 🔍 Verification

```bash
# Verify that all docs, adapters, and tool registries comply with project standards
npm run check:docs
```
