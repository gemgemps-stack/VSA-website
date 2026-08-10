# AGENTS.md — For AI agents & humans

Verdida Sports Apparel (VSA): retail ERP. React 19/CRA frontend + Spring Boot 4.0.6/Java 17 backend. Full docs: see `docs/` (Obsidian). Read [[INDEX]] then [[ARCHITECTURE]] before editing.

## Repo layout
- `backend/backend/` — Spring Boot API (package `sports.apparel.backend`). Maven wrapper `mvnw.cmd`.
- `frontend/` — React app + Electron desktop (`electron/`, `electron-builder.yml`).
- `docs/` — INDEX, OVERVIEW, ARCHITECTURE, SETUP, ADMIN (wiki-linked).

## Commands
- Backend dev: `cd backend/backend; .\mvnw.cmd spring-boot:run` (port 8081, H2, profile `local`).
- Backend test: `.\mvnw.cmd test`; build: `.\mvnw.cmd clean package` (prod needs `--spring.profiles.active=prod`).
- Frontend dev: `cd frontend; npm start` (port 3000). Test: `npm test`. Build: `npm run build`.
- Desktop: `npm run electron:dev` (run) / `npm run electron:build` (→ `dist\Verdida-Setup-<ver>.exe`).

## Rules (strict)
- Facts must come from code, never invent. For behavior/ports/routes, cite the file.
- Never print real secrets or credentials; state only *where* they live (e.g. Render env `JWT_SECRET`).
- `docs/*.md` follow Obsidian style: wiki-links `[[NoteName]]` (no `.md`); every doc ends with `## 📎 Related` linking INDEX + all siblings.
- AGENTS.md stays terse (~40–60 lines). Keep it in sync with the code, not the other way round.
- No source-code comments unless asked.

## Key facts
- Ports: backend default 8080 / local 8081; frontend 3000; Electron random 127.0.0.1 port; API discovery probes 8080–8090.
- Prod URLs: API `https://vsa-backend.onrender.com` (`.env.production`); web `https://verdidasportsapparel.vercel.app` (prod `CORS_ORIGINS` default).
- Auth: JWT 24 h; httpOnly cookie `VSA_AUTH` or `Authorization: Bearer`; CSRF cookie `XSRF-TOKEN` → header `X-XSRF-TOKEN`; stateless; 5 failed logins → 15-min lock.
- Authorization: `@PreAuthorize` per endpoint (`hasRole('ADMIN')` / `hasAuthority('<PAGE_NAME>')`). Authorities = ROLE_ + permissions.
- Roles enum: ADMIN, EMPLOYEE, MARKETING, PRODUCTION, SEWING. Permissions (page_name): INVENTORY_ORDERS, CUSTOMIZED_ORDERS, TEAMS, INVENTORY, CLIENTS, SOURCE_OF_INCOME, ATTENDANCE (+ derived EMPLOYEES=ADMIN).
- Users: username unique 3–100; ADMIN requires email+password; non-admin email/password nullable (V25) but then can't log in; password min 6; salary > 0.
- Data: Hibernate `ddl-auto=update` creates schema; Flyway off by default; migrations `V2`–`V33` alter only. All PKs UUID.
- Idempotency: `request_fingerprint` dedup on write endpoints.
- Env secrets live in Render dashboard: `JWT_SECRET`, `DATABASE_URL`/`SPRING_DATASOURCE_*`, `APP_BOOTSTRAP_ADMIN_*`, `CORS_ORIGINS`, `SPRING_FLYWAY_ENABLED`.
- Frontend localStorage keys: `verdida:accessToken`, `verdida:currentUser`.
- Desktop: no auto-update; distribute the single `dist\Verdida-Setup-<ver>.exe`; CORS relies on `app.cors.allow-localhost=true`.

## Gotchas
- Dev admin only exists on H2 local profile: `admin@verdida.local` / `Admin123!`.
- Prod without `DATABASE_URL` uses ephemeral in-memory H2 → data loss on restart.
- If `main`/electron issues: `electron-builder.yml` sets `extends: null` (react-cra preset would override `main`).
- Frontend keeps 10-min `GET /ping` keep-alive when `REACT_APP_API_URL` set.

## Docs
- [[INDEX]] · [[OVERVIEW]] · [[ARCHITECTURE]] · [[SETUP]] · [[ADMIN]]
