# Project Implementation Plans

สารบัญและโครงสร้างการจัดเก็บแผนงาน (Implementation Plans) ของโปรเจกต์ MyPortStock ซึ่งถูกจัดระเบียบตามสถานะ 4 ระดับ (Single Source of Truth)

---

## 📁 Directory Structure & Lifecycle

```text
docs/plans/
├── completed/       # 🟢 แผนงานที่ดำเนินการเสร็จสมบูรณ์แล้ว (Implemented & Verified)
├── in-progress/     # 🔵 แผนงานที่กำลังพัฒนาอยู่ ณ ปัจจุบัน (Active Development)
├── pending/         # 🟡 แผนงานที่ร่างไว้ / รอดำเนินการในอนาคต (Pending / Drafts / Roadmap)
├── archived/        # ⚪ แผนงานเก่าในอดีต / สรุปประวัติ / ยกเลิก (Archived / Historical)
└── README.md        # 📖 สารบัญแผนงาน (ไฟล์นี้)
```

---

## 🟢 1. Completed Plans (`docs/plans/completed/`)

| Date | File | Description | Status |
|---|---|---|:---:|
| 2026-07-26 | [2026-07-26-enterprise-qa-security-pipeline-plan.md](file:///Users/nopparuj/my-agents/MyPortStock/docs/plans/completed/2026-07-26-enterprise-qa-security-pipeline-plan.md) | Enterprise QA & Security Pipeline (11 Gates, Gitleaks, GitHub Actions) | ✅ Completed |
| 2026-06-28 | [2026-06-28-backend-production-hardening.md](file:///Users/nopparuj/my-agents/MyPortStock/docs/plans/completed/2026-06-28-backend-production-hardening.md) | Gate 0 Backend Production Hardening & Security | ✅ Completed |
| 2026-06-28 | [2026-06-28-per-user-onboarding-preferences.md](file:///Users/nopparuj/my-agents/MyPortStock/docs/plans/completed/2026-06-28-per-user-onboarding-preferences.md) | Per-user onboarding & preferences sync | ✅ Completed |
| 2026-06-27 | [2026-06-27-institutional-risk-refactor-plan.md](file:///Users/nopparuj/my-agents/MyPortStock/docs/plans/completed/2026-06-27-institutional-risk-refactor-plan.md) | Unbiased Institutional CIO (Piotroski, Altman Z, ROCE, Risk Gates) | ✅ Completed |
| 2026-06-27 | [2026-06-27-unbiased-institutional-cio-plan.md](file:///Users/nopparuj/my-agents/MyPortStock/docs/plans/completed/2026-06-27-unbiased-institutional-cio-plan.md) | Original Design Plan for Unbiased CIO Upgrade | ✅ Completed |
| 2026-06-27 | [2026-06-27-ux-ui-polish-plan.md](file:///Users/nopparuj/my-agents/MyPortStock/docs/plans/completed/2026-06-27-ux-ui-polish-plan.md) | UX/UI Polish & WAI-ARIA Accessibility Alignment | ✅ Completed |
| 2026-06-27 | [2026-06-27-skills-ui-improvement-plan.md](file:///Users/nopparuj/my-agents/MyPortStock/docs/plans/completed/2026-06-27-skills-ui-improvement-plan.md) | Agent Skills UI Improvement Roadmap | ✅ Completed |
| 2026-06-20 | [2026-06-20-ux-ui-refactor-plan.md](file:///Users/nopparuj/my-agents/MyPortStock/docs/plans/completed/2026-06-20-ux-ui-refactor-plan.md) | Dark Terminal Product UI Refactor & Runtime Contract (Phases 0–12) | ✅ Completed |
| 2026-06-17 | [2026-06-17-per-user-markdown-runtime-data.md](file:///Users/nopparuj/my-agents/MyPortStock/docs/plans/completed/2026-06-17-per-user-markdown-runtime-data.md) | Per-user Markdown Runtime Data Migration | ✅ Completed |
| 2026-06-15 | [2026-06-15-impeccable-critique-ui-remediation.md](file:///Users/nopparuj/my-agents/MyPortStock/docs/plans/completed/2026-06-15-impeccable-critique-ui-remediation.md) | Impeccable Critique UI Remediation | ✅ Completed |
| 2026-06-15 | [2026-06-15-backend-supabase-implementation-plan.md](file:///Users/nopparuj/my-agents/MyPortStock/docs/plans/completed/2026-06-15-backend-supabase-implementation-plan.md) | Backend Supabase Implementation Plan | ✅ Completed |
| 2026-06-15 | [2026-06-15-backend-supabase-integration.md](file:///Users/nopparuj/my-agents/MyPortStock/docs/plans/completed/2026-06-15-backend-supabase-integration.md) | Backend Supabase Integration | ✅ Completed |
| 2026-06-14 | [2026-06-14-dark-terminal-theme-migration.md](file:///Users/nopparuj/my-agents/MyPortStock/docs/plans/completed/2026-06-14-dark-terminal-theme-migration.md) | Dark Terminal Theme Migration | ✅ Completed |
| 2026-06-14 | [2026-06-14-dashboard-realtime.md](file:///Users/nopparuj/my-agents/MyPortStock/docs/plans/completed/2026-06-14-dashboard-realtime.md) | Dashboard Realtime Capabilities | ✅ Completed |
| 2026-06-14 | [2026-06-14-command-center-implementation.md](file:///Users/nopparuj/my-agents/MyPortStock/docs/plans/completed/2026-06-14-command-center-implementation.md) | Command Center Implementation | ✅ Completed |
| 2026-06-14 | [2026-06-14-aifloor-realtime.md](file:///Users/nopparuj/my-agents/MyPortStock/docs/plans/completed/2026-06-14-aifloor-realtime.md) | AI Floor Realtime Integration | ✅ Completed |
| 2026-06-14 | [2026-06-14-supabase-migration.md](file:///Users/nopparuj/my-agents/MyPortStock/docs/plans/completed/2026-06-14-supabase-migration.md) | Initial Supabase Schema Migration | ✅ Completed |
| 2026-06-11 | [2026-06-11-pixel-agent-view-shape.md](file:///Users/nopparuj/my-agents/MyPortStock/docs/plans/completed/2026-06-11-pixel-agent-view-shape.md) | Pixel Agent View Shape Contract | ✅ Completed |
| 2026-06-10 | [2026-06-10-ai-trading-assistant.md](file:///Users/nopparuj/my-agents/MyPortStock/docs/plans/completed/2026-06-10-ai-trading-assistant.md) | Initial AI Trading Assistant Architecture | ✅ Completed |

---

## 🔵 2. In-Progress Plans (`docs/plans/in-progress/`)

*(ปัจจุบันยังไม่มีแผนงานที่อยู่ระหว่างการพัฒนาแบบ Active Code Changes — เมื่อเริ่มทำแผนงานจาก `pending/` ให้ย้ายมาที่โฟลเดอร์นี้)*

---

## 🟡 3. Pending / Draft Plans (`docs/plans/pending/`)

| Date | File | Description | Target Scope |
|---|---|---|:---:|
| 2026-07-27 | [2026-07-27-test-coverage-gap-plan.md](file:///Users/nopparuj/my-agents/MyPortStock/docs/plans/pending/2026-07-27-test-coverage-gap-plan.md) | 3-Phase Plan to close test coverage gaps (+31 tests: DB, Frontend, Backend) | Future QA Hardening |
| 2026-06-28 | [2026-06-28-product-platform-roadmap.md](file:///Users/nopparuj/my-agents/MyPortStock/docs/plans/pending/2026-06-28-product-platform-roadmap.md) | Long-term Product Platform & Feature Roadmap | Product Vision |
| 2026-06-28 | [2026-06-28-webapp-pwa-implementation-plan.md](file:///Users/nopparuj/my-agents/MyPortStock/docs/plans/pending/2026-06-28-webapp-pwa-implementation-plan.md) | WebApp PWA Installation, Service Worker, and Offline Capabilities | Future PWA Feature |

---

## ⚪ 4. Archived Plans (`docs/plans/archived/`)

| Date | File | Description | Reason |
|---|---|---|:---:|
| 2026-06-14 | [2026-06-14-project-status-summary.md](file:///Users/nopparuj/my-agents/MyPortStock/docs/plans/archived/2026-06-14-project-status-summary.md) | Project status summary checkpoint | Historical record |
| 2026-06-14 | [2026-06-14-command-center-todo.md](file:///Users/nopparuj/my-agents/MyPortStock/docs/plans/archived/2026-06-14-command-center-todo.md) | Command center historical task list | Historical record |

---

## 💡 Standard Lifecycle Rules

1. **สร้างแผนใหม่ (Pending / Draft):**
   - ร่างไฟล์แผนงานที่ `docs/plans/pending/YYYY-MM-DD-plan-name.md` พร้อมใส่ YAML Frontmatter (`status: Pending`)
2. **เริ่มลงมือพัฒนา (In Progress):**
   - ย้ายไฟล์ไปยัง `docs/plans/in-progress/YYYY-MM-DD-plan-name.md` และเปลี่ยนสถานะเป็น `status: In Progress`
3. **พัฒนาเสร็จและผ่านการทดสอบ (Completed):**
   - ย้ายไฟล์ไปยัง `docs/plans/completed/YYYY-MM-DD-plan-name.md` และเปลี่ยนสถานะเป็น `status: Completed`
4. **อัปเดตสารบัญ:**
   - อัปเดตตารางใน `docs/plans/README.md` และลงบันทึกใน `PROJECT_MEMORY_INDEX.md`
