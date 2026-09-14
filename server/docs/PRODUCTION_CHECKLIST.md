# TGMS — Production Environment Checklist

Run through this list before/while deploying (Phase 12). Every checked item is a deploy-time
requirement; the code enforces the critical ones at startup via `src/config/env.js`.

## Environment variables (set on Render, never committed)

| Var | Local (dev `.env`) | Production (Render) |
|---|---|---|
| `DATABASE_URL` | `postgresql://tgms:tgms@localhost:5432/tgms?schema=public` | Render Postgres **external** URL, e.g. `postgresql://user:pass@dpg-xxx.render.com:5432/db?sslmode=require&schema=public` |
| `JWT_SECRET` | `dev-only-change-me-in-prod` | `openssl rand -hex 32` → >=32 chars, **not** starting with `dev-only` |
| `PORT` | `4000` | Render auto-injects; leave unset on Render |
| `NODE_ENV` | `development` | `production` |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Exact Vercel URL, e.g. `https://tgms.vercel.app` (no trailing slash) |
| `COOKIE_DOMAIN` | *(empty)* | Set **only** if the API is served on a custom domain that differs from where the browser needs it scoped. Usually leave empty — Render serves API + cookie on the same host. **Must be empty on Render** unless you know it's needed. |

## Code-enforced at startup (`validateEnv()`)

- `DATABASE_URL` + `JWT_SECRET` are **required** in every environment.
- In production: `JWT_SECRET` must be ≥32 chars and must NOT be the `dev-only-…` placeholder.
- Production requires `CLIENT_ORIGIN` (prevents accidental open CORS).

## Cookie behavior in production (the cross-site gotcha)

- The React SPA (Vercel) and the Express API (Render) are **cross-site**.
- `authController` sets `SameSite=None + Secure` automatically when `NODE_ENV=production`,
  so the browser will send the cookie cross-site; local dev uses the safer `Lax`.
- `secure: true` in production means the API must be served over **HTTPS** (Render provides this).
- `credentials: true` must stay in CORS config (it is) — otherwise the browser drops the cookie.

## DB migrations on deploy

- Run `npx prisma migrate deploy` on Render before the app serves traffic
  (added as a Render Start step or pre-deploy command).
- **Do NOT** use `prisma migrate dev` in production.

## Security headers

- Helmet is always on. It sets HSTS, `X-Content-Type-Options: nosniff`, and CSP defaults.
- Swagger UI (`/api/docs`) is **disabled in production** (`NODE_ENV=production` guard in `app.js`).

## Rate limiting & secrets

- `express-rate-limit` is added in Phase 11 — verify it is present before going live.
- Rotate `JWT_SECRET` before demo day if it was ever shared.

## Smoke test after deploy

```bash
curl -s https://<api-url>/api/health        # → {"status":"ok","database":"connected",...}
curl -s https://<api-url>/api/docs -o /dev/null -w "%{http_code}"   # → 404 (Swagger disabled in prod)
```