# Teacher Guidance Management System (TGMS) — Project State

_This file is the running state record of the project. Update it at the end of every phase._

---

## 1. Identity

| | |
|---|---|
| **Name** | Teacher Guidance Management System (TGMS) |
| **One-line purpose** | Web platform where teachers record student academic progress, admins onboard teachers via single-use invites, and students get real-time read-only visibility into their own records. |
| **Problem solved** | Student progress lives in paper registers, spreadsheets and teachers' heads — no consolidated view, students learn results weeks late, records get lost/altered, teachers burn time on admin. |
| **Users** | Schools / colleges. Three roles: **ADMIN** (seeded, issues teacher invites), **TEACHER** (write progress + notices), **STUDENT** (read-only own record + notices). |
| **Deadline** | ~2026-09-23 (college project seminar). Last full-session update: 2026-09-14. |

**Repo / paths:** project root `/home/tauheedkhan/Desktop/teacher-guidance-management-system` · GitHub `tauheedkhan1717-max/teacher-guidance-management-system` · remote HTTPS · branch `master`, tracks `origin/master`.

## 2. Locked stack (chosen by user — do not change without asking)

Plain JavaScript (ES modules, **NOT** TypeScript) · Node.js v22.23.2 + Express 5.2.1 · React 19.3 + Vite 5.4 + Tailwind CSS 3.4 + React Router 6.30 · PostgreSQL 16 (Docker local / Render prod) · Prisma ORM **pinned 5.22.0** (v7's generator broke once — verify `npx prisma --version` before any upgrade) · JWT in httpOnly cookie + bcryptjs · Zod **v4** (error access via `err.issues`; `.strict()` everywhere) · helmet / cors / express-rate-limit · Recharts (installed, unused until analytics returns) · pdfmake (installed, unused until reports return) · Vitest + Supertest planned, **never written** · Render (API + DB) + Vercel (frontend) · Git + GitHub.

## 3. Final architecture

Three-tier, frontend/backend split (a future mobile app can reuse the same API; `Authorization: Bearer` already supported alongside the cookie).

```
BROWSER (React SPA, Vercel / vite :5173 dev)
   │ HTTPS + JSON, httpOnly cookie carrying JWT
   ▼
EXPRESS API (Render / :4000 dev) ── only trusted component
   helmet → cors(credentials) → cookieParser → json/urlencoded(1mb) → morgan
   → apiLimiter(/api) + authLimiter(/api/auth) → authenticate → authorize(...roles)
   → identity-scope gates → validate(Zod) → controller → Prisma $transaction(+AuditLog)
   │ Parameterised queries only
   ▼
POSTGRESQL 16 (Docker `tgms-db` :5432 local / Render prod)
```

### Auth / authorisation flow (the core of the project)
login → JWT signed by server → httpOnly cookie (7-day, `sameSite` lax dev / none prod, optional `COOKIE_DOMAIN`) → `authenticate` verifies signature (cookie OR Bearer) → attaches `{userId, role, name}`; no/invalid token = **401**. `authorize(...roles)` closure = **403** on mismatch. Identity-scope gates (student may only read own progress; teacher may only delete own notices) read the JWT, never client input, and are separate middleware/controller logic. Then Zod `.strict()` (forged `role`/unknown keys → 400). Then Prisma interactive `$transaction` writing the domain row + AuditLog **via the tx client `tx`** — never the global `prisma` inside a transaction (historical P2003 bug). Security is **server-side only** — hiding UI is never security; every request re-checked in middleware. ← headline claim + best interview talking point.

### Permission model (CURRENT, as of 2026-09-15)
- **Three roles** — `ADMIN | TEACHER | STUDENT` (Prisma enum; `User.role` defaults to STUDENT).
- Public registration mints **STUDENT exclusively** (role hard-coded in controller). **TEACHER accounts are invite-only**: ADMIN generates single-use 7-day `TeacherInvite` codes; teacher redeems at `/teacher-register`. ADMIN exists only via seed.
- **Teacher write-scope is GROUP-BASED (live since 2026-09-15):** a teacher may log progress ONLY for students who are active members of one of THEIR groups — enforced by `requireGroupAccess` middleware re-querying live `GroupMember` membership on every request (removing a student from a group revokes write access instantly). ADMIN bypasses the membership gate but progress writes remain TEACHER-only by role. Teachers may still VIEW every student.
- **Bulk operations (live since 2026-09-15):** teachers select any number of students from the directory and run 3 actions in one transaction each, all audited: **bulk add progress** (`POST /progress/bulk` — one entry per selected student, same title/marks/remark; membership-gated per student so in-group succeed and out-of-group fail independently), **bulk add to groups** (`POST /bulk/members` — enroll selected students into 1+ of the teacher's own groups; already-in-group members are skipped with a 201 summary, never fail), and **bulk enroll / save profile** (`POST /bulk/student-profile` — set roll/year/phone for selected students; only students in the teacher's groups may be edited). ADMIN can do all three except progress (blocked by role), and bulk-members for any group.
- **Student-facing group visibility (live since 2026-09-15):** `GET /students/me/memberships` returns the student's active groups + guide teacher names; the Student Dashboard shows group count badge in the header, a 'Your academic groups' section listing each group + guide + joined date, and 'No groups yet' when empty.
- Group management: TEACHER owns their groups (owner-or-ADMIN enforced in controller for member ops/delete); ADMIN sees and manages all groups.
- Notice board: read = any authenticated role; post = TEACHER/ADMIN; soft-delete = author or ADMIN (server-enforced).

## 4. Database schema (IMPLEMENTED — `server/prisma/schema.prisma`, one migration `20260914113323_init_core_schema`)

Every model: `uuid()` PK, `createdAt`/`updatedAt`, `isDeleted` soft-delete flag (nothing physically erased).

| Model | Key fields / notes |
|---|---|
| `User` | email (unique), passwordHash, name, role enum. No role-specific data (auth/domain split). |
| `StudentProfile` | userId (unique), rollNumber (unique), yearOfAdmission, phone?. No class/batch/address (pruned). |
| `TeacherProfile` | userId (unique), employeeId (unique), department. |
| `ProgressEntry` | studentId, type (`UNIT_TEST\|MICRO_PROJECT\|END_SEM\|ASSIGNMENT`), title, marksObtained?, maxMarks?, remark?, recordedAt. **No subjectId/teacherId** (pruned; group-scoping next phase). |
| `TeacherInvite` | code (unique), department, createdById, usedById (unique), isUsed, expiresAt. Single-use, expiring; unused past expiry displays "Expired". |
| `Group` / `GroupMember` | teacher-owned student groupings — **the teacher write-scope primitive, LIVE since 2026-09-15**. `GroupMember` has `@@unique([groupId, studentId])`, so re-adding a soft-deleted member RESTORES the row (create would violate the constraint). |
| `Notice` | title, content, authorId→User. **LIVE since 2026-09-14** (see §5, Phase 14). |
| `LeaveRequest` | studentId, reason, startDate, endDate, status enum `PENDING\|APPROVED\|REJECTED`. **Schema-ready, zero API.** |
| `Attendance` | studentId, date, isPresent, `@@unique([studentId, date])`. **Schema-ready, zero API.** |
| `AuditLog` | actorId→User, action, entityType, entityId, **`beforeData`/`afterData` TEXT columns holding JSON.stringify'd snapshots** (NOT Json columns, NOT named before/after). |

**Design decision to defend in viva:** single `ProgressEntry` table with a `type` discriminator (one unified timeline per student); the auth-root `User` vs role-profile split (auth data never mixes with domain data); soft deletes reconcile "records can't be tampered with"; tx+AuditLog atomicity means a mutation can never exist without its audit row.

## 5. Phase roadmap & status

| # | Phase | Status |
|---|---|---|
| 1 | Skeleton, .gitignore, git init, GitHub, docs | ✅ commit `b72970a` |
| 2–6 | Docker Postgres, Prisma, Express, auth+RBAC, core API, hardening, Swagger | ✅ (superseded by the "MVP prune": subjects/classes/requests/reports/analytics stripped) |
| 7–11 | React client, dashboards, invite system, defensive-UI pass | ✅ built across several sessions; **landed in git 2026-09-14** (commit `e8c9b42`) — everything had been untracked |
| 12 | Deep clean + stabilisation session (2026-09-14) | ✅ build-verified client (372 kB), deleted 8 dead files (commit `5fa2a19`), removed monolith-era root relics (empty `server.js`, mongoose root `package.json`, empty `controllers/models/routes/public/` dirs), documented §7 debt |
| 13 | **Notice Board** (first Pro-Max feature) | ✅ 2026-09-14, commit `141566c` — full vertical slice, live-verified end-to-end |
| 14 | PDF report card (pdfmake), student phone self-edit | ⬜ reclaim pdfmake integration from git history of old repo |
| 15 | Group-based teacher scoping (`Group`/`GroupMember`) | ✅ 2026-09-15 — groups CRUD + member management + `requireGroupAccess` on progress writes; full matrix live-verified (403 outsider/other-teacher/removed-member, RESTORED re-add, audit rows) |
| 16 | Bulk teacher operations + student group visibility | ✅ 2026-09-15 — bulk add progress (`/progress/bulk`), bulk add to groups (`/bulk/members`), bulk enroll/save profile (`/bulk/student-profile`); student memberships read `GET /students/me/memberships`; GroupsPage verified; TeacherDashboard bulk bar live in build; Vite build green (407 kB); backend smoke-test left to user (sandbox can't sustain long-running server) |
| 16 | Analytics rebuild (Recharts, real entries, attendance %) | ⬜ |
| 17 | Final deploy: Render + Vercel, env vars, `prisma migrate deploy` | ⬜ |
| 18 | README + architecture diagram + ERD + screenshots + demo accounts + demo recording + resume bullets | ⬜ |

## 6. API surface (live, verified 2026-09-14)

| Route | Middleware chain | Notes |
|---|---|---|
| `GET /api/health` | apiLimiter | `{status, service, database, uptimeSeconds, timestamp}`; 503 if DB down. **NB: health is at `/api/health`, not `/api`.** |
| `POST /api/auth/login` | authLimiter · validate(loginSchema) | Identical 401 for unknown-user vs wrong-password (anti-enumeration); sets cookie |
| `GET /api/auth/me` | authenticate | Re-reads live User row |
| `POST /api/auth/logout` | — | Clears cookie |
| `POST /api/auth/register` | validate(registerSchema) | Student self-signup; role hard-coded STUDENT; User+StudentProfile+AuditLog in one tx; auto-login |
| `POST /api/auth/register-teacher` | validate(registerTeacherSchema) | Invite-only; duplicate email 409; no auto-login |
| `POST /api/admin/invites` | authenticate · authorize(ADMIN) | Random 8-char code, 7-day expiry |
| `GET /api/admin/invites` | authenticate · authorize(ADMIN) | `createdBy`/`usedBy` are **objects** (frontend unwraps `.name`); returns bare array |
| `POST /api/progress` | auth · authorize(TEACHER) · validate · **requireGroupAccess** | Write-scope: student must be an active member of the teacher's group (ADMIN bypasses gate but role gate still blocks admin); FK-checks student (400); entry+AuditLog tx → 201 |
| `GET /api/progress/me` | auth · authorize(STUDENT) | Declared before `/:studentId` (param-swallowing hazard) |
| `GET /api/progress/:studentId` | auth · authorize(TEACHER,STUDENT) · own-id gate | Student + not-own-id → 403 |
| `GET /api/students` | auth · authorize(TEACHER,ADMIN) | `{students:[...]}`, rollNumber order |
| `GET /api/groups` | auth · authorize(TEACHER,ADMIN) | TEACHER: own groups + memberCount; ADMIN: all groups; `{groups:[...]}` |
| `POST /api/groups` | auth · authorize(TEACHER,ADMIN) · validate | `.strict()` name only (Group model has no description column); group+AuditLog tx → 201 |
| `DELETE /api/groups/:id` | auth · authorize(TEACHER,ADMIN) | Soft delete; owner-or-ADMIN (403 otherwise); 404 if missing |
| `GET /api/groups/:id/members` | auth · authorize(TEACHER,ADMIN) | Owner-or-ADMIN; active members with user info |
| `POST /api/groups/:id/members` | auth · authorize(TEACHER,ADMIN) · validate | Owner-or-ADMIN; FK pre-check (400); 409 if already active member; **RESTORES** soft-deleted membership (200) because `@@unique([groupId,studentId])` blocks re-create; tx+AuditLog |
| `DELETE /api/groups/:id/members/:memberId` | auth · authorize(TEACHER,ADMIN) | Soft-deletes membership; owner-or-ADMIN; tx+AuditLog(SOFT_DELETED) |
| `GET /api/notices` | authenticate | Any role; `{notices:[...]}` newest-first, author included |
| `POST /api/notices` | auth · authorize(TEACHER,ADMIN) · validate | title 3–150, content 1–5000, `.strict()`; notice+AuditLog(CREATED) tx → 201 |
| `DELETE /api/notices/:id` | auth · authorize(TEACHER,ADMIN) | Soft delete; author-or-ADMIN enforced in controller (403 otherwise); 404 if missing/already deleted; AuditLog(SOFT_DELETED) with beforeData |
| `GET /api/docs` | dev only | ⚠️ **Stale** — documents the pre-prune API |

## 7. Known technical debt (fix-first list, priority order)

1. **Response envelope inconsistency**: mixed `{user}` `{entries}` `{students}` `{notices}` `{notice}` + bare array from `listInvites`. Standardize (e.g. always `{data}`); AdminDashboard survives only via its `?? res.data` fallback.
2. **Stale docs**: `server/src/docs/swagger.yaml` + `server/docs/TGMS_API_Collection.json` document subjects/requests/reports. Regenerate (see §6 for the real surface).
3. **app.js quirk**: `adminRouter` mounted inside the rate-limiter block (works — limiter order correct — but confusing). Move it down with the other routers.
4. **Unused deps**: client `@reduxjs/toolkit`, `immer` (zero usage), `recharts` (until Phase 16); server `pdfmake` (until Phase 14).
5. **No tests, no CI.** API surface is small and stable — ideal Vitest+Supertest starting point; test the invite lifecycle and the notice ownership gate first.
6. **Reusable UI**: three dashboards + NoticeBoard hand-roll cards/badges/spinners — extract `SummaryCard`, `Badge`, `Modal`, `Table` into `components/ui/`.
7. **Dead code**: `server/src/lib/audit.js` writes removed `before`/`after` columns; nothing imports it — delete.
8. **Cosmetics**: odd indentation at `App.jsx` around the public routes block; `LoginPage` `try {` indent.

## 8. Dummy / demo data

- **Seed (server/prisma/seed.js, idempotent upsert):** `admin@tgms.edu` / `Admin@Root123` ("System Administrator") + demo invite code `POLY-ADMIN-CREATES-INVITE` (Computer Engineering, 7-day expiry from seed time).
- **Live demo state (2026-09-15):** notice "Welcome to the TGMS notice board" (admin) · group "Gate Test Batch" (teacher Gate Test Teacher) containing student GT-100 with two progress entries. Smoke-test artifacts soft-deleted during verification remain only as AuditLog rows (by design).
- **Extra demo accounts created during group-scope verification (2026-09-15):** teachers `gatet1@tgms.test` / `gatet2@tgms.test` and students `gates1@tgms.test` (GT-100) / `gateout@tgms.test` (GT-200), all password `Teacher@1234` / `Stud@12345` respectively — usable for the seminar demo, or deletable before deploy.

## 9. Operational reference

- **Ports**: API :4000 (user's nodemon usually running — check before starting another) · client :5173 (user's vite usually running) · Postgres :5432 (Docker `tgms-db`).
- **Env**: server `.env` per `server/.env.example` (`DATABASE_URL`, `JWT_SECRET` ≥32 chars in prod, `PORT=4000`, `NODE_ENV`, `CLIENT_ORIGIN`, optional `COOKIE_DOMAIN` — leave unset); client `VITE_API_URL` optional.
- **Commands**: `npm run dev` both sides · `npx prisma migrate dev` local / `migrate deploy` prod · `npm run seed` · `npx vite build` in `client/` (verified green 2026-09-14).
- **Deploy configs**: `server/render.yaml` + `client/vercel.json`.
- **Machine**: Pop!_OS 24.04, 3.3 GiB RAM (Docker over native; pdfmake over Puppeteer), Node v22.23.2, npm 10.9.8.

## 10. Historical bug patterns to never repeat

(a) global `prisma` used inside `$transaction` → P2003 on `AuditLog_actorId_fkey` — always use `tx`; (b) old `auditLog` helper with `before`/`after` on the new schema → column mismatch — current columns are `beforeData`/`afterData` and hold stringified JSON; (c) Prisma `Date` objects hitting string methods → guarded formatters (`fmtDate`); (d) rendering API objects as React children → white screen — unwrap with `?.` + fallback, `Array.isArray` before `.map`; (e) `<select>` string vs number → `z.coerce` on intake; (f) `</ProtectedRoute />` self-closing **closing** tag — esbuild "Expected `>` but found `/`" (caught 2026-09-14); (g) writing a Zod-accepted field that has NO Prisma column (Group `description`) → PrismaClientValidationError 500 — always cross-check schema.prisma before adding form fields; (h) re-creating a row under `@@unique` after soft delete → P2002 forever — RESTORE soft-deleted rows instead of creating (GroupMember addMember does this).

## 11. Sandbox limitations (for future assistants)

- Registry/terminal access is intermittent; verify file state by reading, and have the user run installs/builds when terminals fail (2026-09-14: builds/terminals worked).
- Background processes spawned from a terminal command get reaped when it exits — a `nohup vite &` dies with the command; attach to the user's own dev servers instead.
- PDF text: `pdftotext -layout f.pdf -`. PPTX: unzip + `xml.etree.ElementTree`, iterate `ppt/slides/slideN.xml` for `a:t`.

## 12. Outstanding non-code work

- **Deck (a):** 6-slide "Dark Mode Tech" PDF deck (no title/thank-you slides, one `[Image Suggestion]` per slide) — NOT delivered.
- **Deck (b):** `~/Desktop/TGMS UI & Working Flow (2).pptx` — 15 slides exist, all speaker-note slots EMPTY ("How to Explain (Hinglish Speaker Notes)" missing).
- `~/Desktop/ppt-3-final/TGMS_Software_UI_Mockups.pptx` — overview deck, not the requested format; LibreOffice lock files present — close LibreOffice before editing.
- Abstract PDF: `~/Desktop/TGMS-ABSTRACT/Teacher_Guidance_Management_System_Abstract-1.pdf`.
