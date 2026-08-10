# INDEX — Verdida Sports Apparel (VSA) Docs

This is the map of content for the VSA-web project — a retail ERP for a sports apparel shop (inventory, orders, income, clients, employees, attendance). Read this first, then jump to the doc you need.

## 📚 Documentation Map

| Doc | What it covers | Read it when… |
| --- | --- | --- |
| [[OVERVIEW]] | One-paragraph summary, tech stack, features, folder layout, quick-run commands | You are new to the repo and need the big picture. |
| [[ARCHITECTURE]] | Data flow, module layout, DB schema, security model, frontend↔backend wiring | You are about to change code and need to know how pieces connect. |
| [[SETUP]] | Step-by-step run instructions, every env var / config file, troubleshooting table | You need to run the app locally or deploy it. |
| [[ADMIN]] | How auth works, roles/permissions, creating users & admins, DO-NOT warnings | You manage users, permissions, or production credentials. |

## 🧭 Suggested reading order

1. [[INDEX]] (this page)
2. [[OVERVIEW]]
3. [[ARCHITECTURE]]
4. [[ADMIN]] (auth is central to everything here)
5. [[SETUP]] (then actually run it)

## 🔑 Key Facts

### Ports
- Backend, **local profile**: `8081` (override via `PORT` env) — `backend/backend/src/main/resources/application-local.properties`
- Backend, **default / prod**: `8080` (override via `PORT` env, Render sets this) — `application.properties`, `application-prod.properties`
- Frontend dev server (CRA): `3000` (`npm start`)
- Desktop (Electron) app: **random** `127.0.0.1` port chosen at launch by `frontend/electron/main.js`
- Backend localhost discovery probe range: `8080`–`8090` — `frontend/src/services/api.js`

### URLs
- Backend API (prod): `https://vsa-backend.onrender.com` — set in `frontend/.env.production` as `REACT_APP_API_URL`
- Frontend prod: `https://verdidasportsapparel.vercel.app` — default value of `app.cors.origins` / `CORS_ORIGINS`
- Health check endpoint: `GET /api/auth/health` (public), also `GET /ping` (public), `GET /actuator/health` (public)
- Swagger/OpenAPI: enabled only outside prod (`/swagger-ui.html`, `/v3/api-docs`), requires `ROLE_ADMIN`; disabled in prod (`springdoc.*.enabled=false`)

### Where credentials / secrets live (never printed here — locations only)
- `JWT_SECRET` — backend env var (Render dashboard). Fallback defaults: `dev-secret-change-me` (local), `change-me-in-production` (prod). See `application.properties`, `application-local.properties`, `application-prod.properties`.
- `DATABASE_URL` / `SPRING_DATASOURCE_URL` / `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD` — backend env vars (Render). Fallback is in-memory H2 (ephemeral!).
- `APP_BOOTSTRAP_ADMIN_ENABLED`, `APP_BOOTSTRAP_ADMIN_EMAIL`, `APP_BOOTSTRAP_ADMIN_USERNAME`, `APP_BOOTSTRAP_ADMIN_PASSWORD` — backend env vars; seed an initial admin on a fresh DB (see [[ADMIN]]).
- `CORS_ORIGINS` — backend env var; comma-separated allowed origins.
- `REACT_APP_API_URL` — frontend build-time env; `frontend/.env` (empty for dev), `frontend/.env.production` (prod URL, public, not a secret).
- Local dev admin (H2 only): `admin@verdida.local` / `Admin123!` — auto-seeded by `DataSeeder` in the `local` profile.
- Frontend JWT storage: browser `localStorage` keys `verdida:accessToken` and `verdida:currentUser` — `frontend/src/services/authTokenStorage.js`, `authService.js`.
- Backend auth cookie: `VSA_AUTH` (httpOnly) — `JwtAuthenticationFilter.java`.
- CSRF cookie: `XSRF-TOKEN` (not httpOnly, read by axios), submitted as `X-XSRF-TOKEN` header.

### Gotchas (top 5)
1. **No `V1` Flyway migration exists** — schema is created by JPA `ddl-auto=update`; Flyway is off by default in every profile (`SPRING_FLYWAY_ENABLED=false`). Migrations `V2`–`V33` only *alter* an existing schema.
2. **Non-admin users can be created without email/password** (`V25` made them nullable) — such users **cannot log in**, since login requires both email and password.
3. **Prod DB falls back to in-memory H2** if `DATABASE_URL` is missing — all data vanishes on restart.
4. **`DEBUG_API_REQUESTS=true`** is on in `frontend/src/services/api.js` — logs every request/error to the console.
5. **Desktop .exe has no auto-update** — every release is a manually rebuilt installer (see [[SETUP]]).

## 🔗 More context
- Root `README.md` contains the short security notes (JWT secret, bootstrap admin, local admin seed).
- `frontend/README.md` is the stock Create React App readme (outdated; ignore for real setup, see [[SETUP]]).
- Desktop packaging lives in `frontend/electron/` + `frontend/electron-builder.yml`.

## 📎 Related
- [[INDEX]] — start here
- [[OVERVIEW]] — summary, stack, features, quick-run
- [[ARCHITECTURE]] — data flow, schema, security model
- [[SETUP]] — running and deploying
- [[ADMIN]] — users, roles, permissions, DO-NOT warnings
