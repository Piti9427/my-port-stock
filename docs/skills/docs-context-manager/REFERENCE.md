# Docs Context Manager Reference Guide

เอกสารอ้างอิงแสดงโครงสร้างดัชนีนำทางระบบ (Required Registry) และแม่แบบตั้งต้น (Skeleton Templates) สำหรับระบบการจัดระเบียบเอกสารของโปรเจกต์

---

## 1. Required Document Registry (เอกสาร .md ที่ต้องมีตามมาตรฐาน)

### กลุ่มที่ 1: Agent Context Files (ไฟล์กติกาสำหรับ AI Agent)

| ไฟล์ | ที่อยู่ | หน้าที่ | Bootstrap |
|---|---|---|---|
| Project Constitution | `AGENTS.md` (Root) | กติกากลางของทุก Agent — Core Principles, Security, Response Style, Checklist | ดึงแม่แบบจาก `docs/AGENT_CONTEXT_GUIDELINES.md` ข้อ 3.1 |
| Antigravity Adapter | `.agents/AGENTS.md` | Skill auto-trigger mapping สำหรับ Antigravity | ดึงแม่แบบจาก Guidelines ข้อ 3.3.1 |
| Claude Code Adapter | `.claude/CLAUDE.md` | สั่งให้ Claude Code อ่าน Root AGENTS.md | ดึงแม่แบบจาก Guidelines ข้อ 3.3.2 |
| Codex Adapter | `.codex/AGENTS.md` | Skill routing และ docs-audit gate สำหรับ Codex | ดึงแม่แบบจาก Guidelines ข้อ 3.3.6 |
| Cursor Rules Adapter | `.cursorrules` | บังคับให้ Cursor โหลดกติกากลางไปอ่าน | ดึงแม่แบบจาก Guidelines ข้อ 3.3.3 |
| Windsurf Rules Adapter | `.windsurfrules` | บังคับให้ Windsurf โหลดกติกากลางไปอ่าน | ดึงแม่แบบจาก Guidelines ข้อ 3.3.4 |
| Copilot Instructions | `.github/copilot-instructions.md` | บังคับให้ GitHub Copilot โหลดกติกากลางไปอ่าน | ดึงแม่แบบจาก Guidelines ข้อ 3.3.5 |
| Agent Skills Guide | `docs/AGENT_SKILLS.md` | ตารางแมป ประเภทงาน → สกิลที่ต้องโหลด | สร้างตารางจากรายการสกิลใน `docs/skills/` |
| Bootstrap Template | `docs/AGENT_CONTEXT_GUIDELINES.md` | แม่แบบมาตรฐานสำหรับสร้างไฟล์ Context ใหม่ | สร้างโครงตาม Generic Playbook |

### กลุ่มที่ 2: Software Engineering Docs (เอกสารหลักการพัฒนา)

| ไฟล์ | ที่อยู่ | หน้าที่ | Bootstrap |
|---|---|---|---|
| Domain Glossary | `docs/CONTEXT.md` | คำศัพท์เชิงธุรกิจ, Entity สำคัญ, สถานะ Flow | สร้าง Skeleton พร้อมหัวข้อว่าง |
| Architecture | `docs/ARCHITECTURE.md` | ภาพรวมสถาปัตยกรรมระบบ, Sequence Diagram, ขอบเขตระบบย่อย | สร้าง Skeleton + Mermaid diagram placeholder |
| Coding Rules | `docs/CODING_RULES.md` | กฎการเขียนโค้ดร่วมกัน — Naming, Error Handling, Logging | สร้าง Skeleton แยก Frontend/Backend sections |
| Runbook | `docs/RUNBOOK.md` | คำสั่ง Dev, วิธีรันโปรเจกต์, แก้ปัญหาที่พบบ่อย | สร้าง Skeleton: Prerequisites → Run → Troubleshoot |
| Definition of Done | `docs/DEFINITION_OF_DONE.md` | เกณฑ์ส่งมอบงาน — Checklist ยืนยันว่างานเสร็จจริง (เทส, lint, review, no PII) | สร้าง Checklist template |
| Testing Strategy | `docs/TESTING_STRATEGY.md` | กลยุทธ์การทดสอบ — ระดับ Unit/Integration/E2E, เครื่องมือ, Coverage Target, Golden Files | สร้าง Skeleton แยกตาม Test Level |
| API Contract | `docs/API_CONTRACT.md` | สัญญาอินเตอร์เฟซ Front↔Back — Endpoint, Payload Schema, Status Code, Versioning | สร้าง Skeleton + ตาราง Endpoint |
| Deployment Guide | `docs/DEPLOYMENT.md` | ขั้นตอนการ Deploy — Environment (Dev/Staging/Prod), Pipeline, Rollback | สร้าง Skeleton แยกตาม Environment |
| Environment Variables | `docs/ENVIRONMENT.md` | ตารางตัวแปร ENV ทั้งหมด — Key, Default, คำอธิบาย, ห้าม Hardcode | สร้างตาราง `Key / Default / Description / Secret?` |

### กลุ่มที่ 3: Root-Level Standard Files (ไฟล์มาตรฐาน Root ระดับโปรเจกต์)

| ไฟล์ | ที่อยู่ | หน้าที่ | Bootstrap |
|---|---|---|---|
| README | `README.md` (Root) | ภาพรวมโปรเจกต์, วิธี Setup, ลิงก์ไปเอกสาร | ปรับปรุงลิงก์ให้สอดคล้อง |
| Contributing Guide | `CONTRIBUTING.md` (Root) | แนวทางการมีส่วนร่วม — Branch Strategy, PR Flow, Commit Message Convention | สร้าง Skeleton: Branch → PR → Review → Merge |
| Security Policy | `SECURITY.md` (Root) | ช่องทางแจ้งปัญหาด้านความปลอดภัย (Responsible Disclosure), Supported Versions | สร้าง Skeleton ตามรูปแบบ GitHub Security Advisory |
| Changelog | `CHANGELOG.md` (Root) | บันทึกการเปลี่ยนแปลงเป็นเวอร์ชัน ตามรูปแบบ [Keep a Changelog](https://keepachangelog.com/) | สร้าง Skeleton: `## [Unreleased]` + `## [x.y.z] - YYYY-MM-DD` |

### กลุ่มที่ 4: Multi-Agent Collaboration Docs (เอกสารสำหรับ Agent ส่งต่องาน)

| ไฟล์ / โฟลเดอร์ | ที่อยู่ | หน้าที่ | Bootstrap |
|---|---|---|---|
| Handoff Logs | `docs/plans/handoffs/` | บันทึกส่งต่องานระหว่าง Agent — งานที่เสร็จ, จุดระวัง, คำสั่งเทส | สร้างโฟลเดอร์ + README อธิบายรูปแบบ |
| ADR (Architecture Decision Records) | `docs/adr/` | บันทึกเหตุผลตัดสินใจทางสถาปัตยกรรม ใช้รูปแบบ `NNNN-title.md` | สร้างโฟลเดอร์ + ADR template |
| Specs (Design Specs) | `docs/specs/` | เอกสารออกแบบเทคนิค (Tech Spec / RFC / PRD) | สร้างโฟลเดอร์ + README อธิบายประเภท |
| Plans | `docs/plans/` | แผนงานพัฒนาที่ยัง Active | สร้างโฟลเดอร์ |
| Postmortems | `docs/postmortems/` | สรุปผลการแก้บั๊ก (RCA) | สร้างโฟลเดอร์ |
| Archive | `docs/archive/` | คลังเก็บเอกสารที่ปิดงานแล้ว | สร้างโฟลเดอร์ |
| Doc Index | `docs/README.md` | สารบัญนำทางหลักของโฟลเดอร์ `docs/` | สร้างตารางดัชนี |

---

## 2. Skeleton Templates (โครงกระดูกเทมเพลตสำหรับ Bootstrap)

### 2.1 CONTRIBUTING.md
```markdown
# Contributing Guide
## Branch Strategy
<!-- TODO: Fill in — e.g. Git Flow, GitHub Flow, Trunk-based -->
## Commit Message Convention
<!-- TODO: Fill in — e.g. Conventional Commits -->
## Pull Request Process
<!-- TODO: Fill in — PR template, review requirements -->
## Code Review Checklist
<!-- TODO: Fill in -->
```

### 2.2 SECURITY.md
```markdown
# Security Policy
## Supported Versions
<!-- TODO: Fill in version support table -->
## Reporting a Vulnerability
<!-- TODO: Fill in — contact email, expected response time, responsible disclosure -->
## Security Practices
<!-- TODO: Fill in — input validation, auth, secrets management -->
```

### 2.3 CHANGELOG.md
```markdown
# Changelog
All notable changes to this project will be documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]
### Added
### Changed
### Fixed
### Removed
```

### 2.4 DEFINITION_OF_DONE.md
```markdown
# Definition of Done
A task is "Done" only when ALL of the following are true:
- [ ] Code compiles/builds without errors
- [ ] Lint passes (`npm run lint` / `dotnet build`)
- [ ] Unit tests pass and cover new logic
- [ ] No PII or secrets in code or logs
- [ ] API contract matches between Front and Back
- [ ] Reviewed by at least one team member or AI review skill
- [ ] Documentation updated (if API/config/flow changed)
- [ ] Manually verified on local environment
```

### 2.5 TESTING_STRATEGY.md
```markdown
# Testing Strategy
## Test Levels
### Unit Tests
<!-- TODO: Tools, conventions, coverage target -->
### Integration Tests
<!-- TODO: Database, API integration testing approach -->
### E2E Tests
<!-- TODO: Playwright/Cypress setup, critical paths -->
## Golden Files
<!-- TODO: Where golden files live, how to update -->
## CI Integration
<!-- TODO: Which tests run on PR, which on merge -->
```

### 2.6 API_CONTRACT.md
```markdown
# API Contract (Frontend ↔ Backend)
## Base URL
<!-- TODO: e.g. /e-sig/api/v1 -->
## Authentication
<!-- TODO: Bearer token, cookie, session -->
## Endpoints
| Method | Path | Request Body | Response | Status Codes | Notes |
|--------|------|-------------|----------|--------------|-------|
<!-- TODO: Fill in endpoints -->
## Error Response Format
<!-- TODO: Standard error shape -->
## Versioning Policy
<!-- TODO: URL versioning, header versioning, etc. -->
```

### 2.7 DEPLOYMENT.md
```markdown
# Deployment Guide
## Environments
| Environment | URL | Branch | Deploy Method |
|------------|-----|--------|--------------|
| Dev | <!-- TODO --> | develop | <!-- TODO --> |
| Staging | <!-- TODO --> | release/* | <!-- TODO --> |
| Production | <!-- TODO --> | main | <!-- TODO --> |
## Deploy Steps
<!-- TODO: Step-by-step deploy procedure -->
## Rollback Procedure
<!-- TODO: How to rollback a bad deploy -->
```

### 2.8 ENVIRONMENT.md
```markdown
# Environment Variables
## Frontend (.env)
| Key | Default | Description | Secret? |
|-----|---------|-------------|---------|
<!-- TODO: Fill in -->
## Backend (appsettings / env)
| Key | Default | Description | Secret? |
|-----|---------|-------------|---------|
<!-- TODO: Fill in -->
## Rules
- Never hardcode secrets in source code
- Use `.env.example` for non-secret defaults
- Document every new ENV variable in this file
```

### 2.9 Handoff Log Template
```markdown
# Agent Handoff — YYYY-MM-DD — <Task Name>
## Completed Work
<!-- What was done, files changed -->
## Current State
<!-- Build status, test results -->
## Watch Points
<!-- Known risks, edge cases, things to verify -->
## Next Steps
<!-- What the next agent should do -->
## Verification Commands
<!-- Commands to run to verify current state -->
```
