# Teacher Guidance Management System (TGMS) — Project State

_This file is the running state record of the project. Update it at the end of every phase._

---

## 1. Identity

| | |
|---|---|
| **Name** | Teacher Guidance Management System (TGMS) |
| **One-line purpose** | Web platform where teachers (admins) record student academic progress and students get real-time read-only visibility into their own records. |
| **Problem solved** | Student progress lives in paper registers, spreadsheets and teachers' heads — no consolidated view, students learn results weeks late, records get lost/altered, teachers burn time on admin. |
| **Users** | Schools / colleges. Two roles only: **TEACHER** (admin, write) and **STUDENT** (read-only own record). |
| **Deadline** | ~2026-09-23 (college project seminar). Today: 2026-09-09. |

## 2. Locked stack (chosen by user — do not change without asking)

Plain JavaScript (ES modules, **NOT** TypeScript) · Node.js 22 + Express 5 · React 19 + Vite + Tailwind CSS + React Router · PostgreSQL 16 (Docker local / Render prod) · Prisma ORM · JWT in httpOnly cookie + bcrypt · Zod validation · helmet / cors / express-rate-limit · Recharts (trend chart) · pdfmake server-side (PDF — NEVER Puppeteer) · Vitest + Supertest (small test set only) · Render (API + DB) + Vercel (frontend) · Git + GitHub.

## 3. Final architecture

Three-tier, frontend/backend split (so a future mobile app can reuse the same API).

```
BROWSER (React SPA, Vercel)
   │ HTTPS + JSON, httpOnly cookie carrying JWT
   ▼
EXPRESS API (Render) ── only trusted component
   helmet → cors → cookieParser → authenticate → requireRole
         → requireSubjectAccess → validate(Zod) → controller
   │ Prisma (parameterised queries only)
   ▼
POSTGRESQL (Docker local / Render prod)
```

### Auth / authorisation flow (the core of the project)
login → JWT signed by server → httpOnly cookie → `authenticate` verifies signature, attaches `{userId, role}`; no token = **401**. `requireRole('TEACHER')` = **403** for students. `requireSubjectAccess` checks TeacherSubject join table = **403** if teacher not assigned that subject. Then Zod. Then Prisma transaction writing ProgressEntry + AuditLog atomically. Returns **201**.

### Permission model (LOCKED)
- Write scope: "Only assigned subjects" — every teacher can VIEW every student; a teacher can only WRITE progress for subjects assigned to them via `TeacherSubject`.
- Security is **server-side only**. Hiding UI buttons is not security; every request re-checked in middleware. ← headline claim + best interview talking point.

## 4. Database schema (PLANNED — NOT IMPLEMENTED, 8 models)

| Model | Key fields |
|---|---|
| `User` | email, passwordHash, role (TEACHER\|STUDENT), name |
| `StudentProfile` | userId, rollNumber (unique), classId, batch, yearOfAdmission, phone, address |
| `TeacherProfile` | userId, employeeId, department |
| `Class` | name ("BCA 3rd Year"), section ("A") |
| `Subject` | name, code, classId |
| `TeacherSubject` | teacherId, subjectId (drives write permission) |
| `ProgressEntry` | studentId, subjectId, teacherId, type (PROJECT\|ASSIGNMENT\|NOTE\|EXAM), title, status, marksObtained, maxMarks, remark, recordedAt, createdAt, updatedAt |
| `AuditLog` | actorId, action, entityType, entityId, before, after, createdAt |

**Design decision to defend in viva:** single `ProgressEntry` table with a `type` discriminator instead of 4 tables. Cost: some nullable columns. Benefit: whole student history = one query, one unified timeline. Pattern: single-table design with discriminator column.

## 5. Phase roadmap & status

| # | Phase | Status |
|---|---|---|
| 1 | Folder skeleton, .gitignore, git init, GitHub repo, first commit, docs/PROJECT_STATE.md | 🟡 IN PROGRESS |
| 2 | Docker Postgres, Prisma schema, first migration, seed data | ⬜ |
| 3 | Express server, env config, error handler, /api/health | ⬜ |
| 4 | Auth + permission model (bcrypt, JWT cookies, role + subject middleware) | ⬜ |
| 5 | Core API: students, classes, subjects, progress, audit, analytics | ⬜ |
| 6 | API verification + optional small permission tests + early backend deploy dry run | ⬜ |
| 7 | Vite + React + Tailwind + Router + auth context + login/register | ⬜ |
| 8 | Student dashboard + trend chart | ⬜ |
| 9 | Teacher dashboard: list, search/filter, student detail, progress forms | ⬜ |
| 10 | PDF report card + polish (loading/empty/error, responsive, 404) | ⬜ |
| 11 | Hardening: rate limit, validation sweep, secret check, headers | ⬜ |
| 12 | Final deploy: Vercel frontend, env vars, prod migrations | ⬜ |
| 13 | README + architecture diagram + ERD + screenshots + demo accounts + demo recording + resume bullets | ⬜ |

Pacing: Phases 1–6 week 1, 7–10 week 2, 11–13 week 3.

## 6. Decisions & constraints

- Stack locked (§2) — over Django and PHP/MySQL alternatives by explicit choice.
- Plain JavaScript, not TypeScript.
- Teacher write scope = assigned subjects only (`TeacherSubject`).
- v1 scope: MUST-haves + trend chart (Recharts) + PDF report card (pdfmake). OUT of v1: attendance, notifications, bulk CSV/Excel upload, badges, leaderboard, parent portal, AI prediction, mobile app, TypeScript migration, full test suite.
- Postgres in Docker locally, never native (3.3 GiB RAM; Docker ≈120 MB only while running).
- pdfmake, never Puppeteer (Chromium ≈300 MB fatal on this RAM + free-tier deploy).
- Writes = Prisma transaction: ProgressEntry + AuditLog atomically (an entry can never exist without its audit row).
- Deletes are soft deletes (reconciles "free from tampering").
- `.gitignore` written before first commit (a committed secret lives in history forever).
- Package versions pinned from the generated lockfile (never guessed — sandbox blocks npm registry).

## 7. Dummy / demo data (mandated by user)

**Teachers:** Ashwini ma'am, Tejas ma'am, Mansi ma'am.
**Students (read-only):** Tauheed, Atif, Jawwad, Siddiq.

## 8. Open questions / assumptions

- [ ] **A1 — Teacher accounts:** seed script creates the first teacher; logged-in teachers create further teachers. Public signup can **never** mint a TEACHER. (Unconfirmed — needed before Phase 2 schema.)
- [ ] **A2 — Students may edit own contact details (phone/address) only**; never rollNumber/class/batch/academic fields. (Unconfirmed.)
- [ ] **A3 — Teacher edits allowed; every edit writes before/after to AuditLog; deletes are soft.** (Unconfirmed — needed before Phase 2 schema.)
- [ ] **A4 — GitHub account:** exists? Username? (Needed to finish Phase 1 push.)

## 9. Verified machine state (2026-09-02)

Pop!_OS 24.04 LTS · Linux 6.18.46-x64v1-xanmod1 · 3.3 GiB RAM (often <1 GiB free) + 5.6 GiB swap · 225 G disk 74% used · Node v22.23.2 · npm 10.9.8 · npx 10.9.8 · Python 3.12.3 · pip 24.0 · Git 2.43.0 · Docker 29.1.3 · MariaDB client 10.11.14 · VS Code 1.135.0 · VSCodium 1.126.04524 · `pdftotext` present.
NOT installed: psql, sqlite3, python-pptx, pypdf, pymupdf, pdfplumber.
`~/.ssh/` exists but is empty (no SSH keys) → GitHub push via HTTPS / `gh` CLI, not SSH.

## 10. Sandbox limitations (for future assistants)

- Assistant sandbox cannot reach registry.npmjs.org (HTTP 403). Never pin guessed package versions — install current versions and read them back from the lockfile.
- PDF text: `pdftotext -layout f.pdf -`. Image-PDFs need visual Read.
- PPTX: unzip + stdlib `xml.etree.ElementTree`, iterate `ppt/slides/slideN.xml` for `a:t` text nodes.

## 11. Other outstanding work (outside the build)

- **Deck (a):** 6-slide project deck — "Dark Mode Tech" aesthetic, exactly 6 slides, NO title slide, NO thank-you slide, sequential topic breakdown, concise bullets, one `[Image Suggestion: ...]` per slide, delivered AS A PDF. (NOT delivered anywhere in home folder — outstanding.)
- **Deck (b) — partially done:** `/home/tauheedkhan/Desktop/TGMS UI & Working Flow (2).pptx` — 15 slides exist and cover the journey (login → teacher dashboard → student read-only → data entry → analytics → PDF → audit log → mobile → request flow), uses mandated dummy names; but all 15 speaker-note slots are **EMPTY** — the required "How to Explain (Hinglish Speaker Notes)" are missing.
- `/home/tauheedkhan/Desktop/ppt-3-final/TGMS_Software_UI_Mockups.pptx` (6 slides, college-template style) exists — an overview deck, NOT the dark-mode PDF format requested for deck (a).
- LibreOffice lock files present in `ppt-3-final/` — close LibreOffice before writing to those files.
- Abstract PDF located: `/home/tauheedkhan/Desktop/TGMS-ABSTRACT/Teacher_Guidance_Management_System_Abstract-1.pdf` (179,642 bytes). All needed abstract content is preserved in the Phase-1 handoff.