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

**Repo / paths (2026-09-09):** project root is `/home/tauheedkhan/Desktop/teacher-guidance-management-system` (renamed from `teacher-guidance-system` to match the GitHub repo). GitHub: username `tauheedkhan1717-max` · repo `/teacher-guidance-management-system` · remote HTTPS · branch `master`, tracks `origin/master`. Local `master` at commit `b72970a` = whatever was pushed.

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

## 4. Database schema (IMPLEMENTED — 9 models)

> Migrations live in `server/prisma/migrations/` (`init` applied; `add_guidance_requests` applied when `npx prisma migrate dev --name add_guidance_requests` succeeds). Commands: `prisma migrate dev` (local), `prisma migrate deploy` (prod).

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
| `GuidanceRequest` | studentId, subjectId, teacherId?, topic, details, status (PENDING\|SCHEDULED\|COMPLETED), teacherReply, respondedAt, createdAt, updatedAt |

**Design decision to defend in viva:** single `ProgressEntry` table with a `type` discriminator instead of 4 tables. Cost: some nullable columns. Benefit: whole student history = one query, one unified timeline. Pattern: single-table design with discriminator column.

## 5. Phase roadmap & status

| # | Phase | Status |
|---|---|---|
| 1 | Folder skeleton, .gitignore, git init, GitHub repo, first commit, docs/PROJECT_STATE.md | ✅ COMPLETE — commit `b72970a` pushed to GitHub (2026-09-09) |
| 2 | Docker Postgres, Prisma schema, first migration, seed data | ✅ COMPLETE — migration `init` applied + seed run (2026-09-09) |
| 3 | Express server, env config, error handler, /api/health | ✅ COMPLETE (user-verified) |
| 4 | Auth + permission model (bcrypt, JWT cookies, role + subject middleware) | ✅ COMPLETE (user-verified) |
| 5 | Core API: students, classes, subjects, progress, audit, analytics | ✅ COMPLETE (user-verified) |
| 6 | API verification + optional small permission tests + early backend deploy dry run | ✅ COMPLETE (user-verified — Swagger `/api/docs`, Postman collection, env validation, prod checklist) |
| 7 | Vite + React + Tailwind + Router + auth context + login/register | 🟡 BUILT — client scaffold + AuthContext + login/register + backend register/classes; browser verify pending |
| 8 | Student dashboard + trend chart | 🟡 BUILT — read-only dashboard + Guidance-Requests EXTENSION (schema, endpoints, UI); migration + browser verify pending |
| 9 | Teacher dashboard: list, search/filter, student detail, progress forms | 🟡 BUILT — progress edit/soft-delete endpoints + StudentsPage + StudentDetailPage (add/edit/delete modals + guidance respond) + ProgressPage + AnalyticsPage; migration + browser verify pending |
| 10 | PDF report card + polish (loading/empty/error, responsive, 404) | 🟡 BUILT — pdfmake report endpoint (`GET /api/reports/:id/pdf` + `/me/pdf`, A4 report card w/ subject table + remarks) + Download buttons + `lib/download.js`; needs `npm i pdfmake` + verify |
| 11 | Hardening: rate limit, validation sweep, secret check, headers | 🟡 IN PROGRESS — express-rate-limit (global + auth) + Zod schemas + validate() wired on auth/progress/requests/students + helmet CSP configured + A2 student-contact endpoint added |
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
- **Prisma pinned to 5.22.0** (user-directed, 2026-09-09) — v7's new generator broke with `provider = "prisma-client-js"`; clean reinstall of `prisma@5.22.0` + `@prisma/client@5.22.0` fixed it. Verify with `npx prisma --version` before any future upgrade.
- Roles are exactly **TEACHER** and **STUDENT** (Prisma enum) — there is NO ADMIN role. `authorize(...roles)` is generic (takes any role list per route); routes that need teacher-only pass `authorize("TEACHER")`. (User's Phase-4 wording mentioned "ADMIN" — flagged, not added, to keep the locked 2-role model.)
- **Guidance Requests — v1 EXTENSION (user-approved 2026-09-10):** documented, deliberate expansion. Students may CREATE guidance requests (`POST /api/requests`, status PENDING) — the single narrow exception to "students never write." Teachers respond only for subjects they are assigned to (`PATCH /api/requests/:id/respond`, same write-scope as progress). Academic progress entries remain strictly teacher-write.
- **Progress edit/soft-delete (Phase 9, 2026-09-10):** `PATCH /api/progress/:id` + `DELETE /api/progress/:id` (soft). Subject-scope resolved via async `requireSubjectAccess` resolver — on PATCH, teacher must be assigned to the new subject if changed, else to the entry's current subject; DELETE checks the entry's subject. Both write before/after to AuditLog atomically.
- **Phase 9 JSX integrity fix (2026-09-10):** a stray duplicate closing block at the tail of `StudentDetailPage.jsx` (leftover `</div>` / `);` / `}`) was removed — it would have failed the Vite build. All Phase 7–9 page files re-verified to terminate cleanly (`App.jsx`, `StudentsPage`, `StudentDetailPage`, `ProgressPage`, `AnalyticsPage`).
- **RegisterPage dropdown fix (2026-09):** `GET /api/classes` returns `{ classes: [...] }`; the fetch now reads `res.data?.classes ?? res.data?.data?.classes ?? res.data` and always sets an array (`setClasses(Array.isArray(...) ? ... : [])`) — fixed the `classes.map is not a function` crash.
- **Phase 11 security hardening (2026-09):** `express-rate-limit` — global `/api` (300/15min) + tighter `/api/auth` (15/15min, brute-force guard). Zod schemas in `src/schemas/index.js` (all `.strict()`) + `validate()` middleware wired onto auth/progress/requests/students — forged `role` or academic-field writes now rejected with 400. Helmet configured (relaxed CSP for Swagger in dev only).

## 7. Dummy / demo data (mandated by user)

**Teachers:** Ashwini ma'am, Tejas ma'am, Mansi ma'am.
**Students (read-only):** Tauheed, Atif, Jawwad, Siddiq.

## 8. Open questions / assumptions

- [x] **A1 — Teacher accounts (CONFIRMED by user 2026-09-09):** teacher accounts are created by Admin (the seeded/first teacher) or by the seed script only. Public signup can **never** mint a TEACHER.
- [x] **A2 — Student contact edits (CONFIRMED by user 2026-09):** students may edit ONLY their own `phone` and `address` (`PATCH /api/students/me`). Academic fields (rollNumber, classId, batch, yearOfAdmission) are locked — rejected by an `.strict()` Zod schema (400) before any handler runs; teachers can still edit them via `PATCH /api/students/:id`.
- [x] **A3 — Edits & deletes (CONFIRMED by user 2026-09-09):** teacher edits allowed; every edit writes before/after to the AuditLog; deletions are **soft** (hidden, never physically erased).
- [x] **A4 — GitHub account (RESOLVED 2026-09-09):** username `tauheedkhan1717-max`; repo `https://github.com/tauheedkhan1717-max/teacher-guidance-management-system`; commit `b72970a` pushed to `master`.

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