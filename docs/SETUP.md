# SETUP — Running and deploying Verdida Sports Apparel

## 🧰 Prerequisites

- **Java 17** (backend compiles with `java.version=17`; container uses Temurin 17).
- **Maven** (or use the bundled `mvnw`/`mvnw.cmd` wrapper in `backend/backend`).
- **Node.js** (project was built with Node 22) + **npm**.
- For the desktop installer: Windows (NSIS target is x64 only).

## ▶️ Backend

### Local development (H2, in-memory, port 8081)

```powershell
cd backend/backend
.\mvnw.cmd spring-boot:run
```

- Active profile defaults to `local` (`application.properties` → `spring.profiles.active=${SPRING_PROFILES_ACTIVE:local}`).
- H2 in-memory, `ddl-auto=update`, Flyway disabled.
- DataSeeder auto-seeds an admin **only on H2**: `admin@verdida.local` / `Admin123!`.
- CORS: `app.cors.allow-localhost=true` (any `localhost:*` / `127.0.0.1:*` origin).

### Tests

```powershell
.\mvnw.cmd test
```

Test classes: `BackendApplicationTests`, `features/users/UserServiceTest`, `support/IdempotencyServiceTest`. Test config: `src/test/resources/application.properties`.

### Build a production jar

```powershell
.\mvnw.cmd clean package          # → target/backend-0.0.1-SNAPSHOT.jar
java -jar target/backend-0.0.1-SNAPSHOT.jar --spring.profiles.active=prod
```

### Docker

```powershell
docker build -t vsa-backend backend/backend
docker run -p 8080:8080 -e JWT_SECRET=... -e DATABASE_URL=... vsa-backend
```

`backend/backend/Dockerfile`: multi-stage maven build → `eclipse-temurin:17-jre-alpine`, runs `java -jar app.jar --spring.profiles.active=prod`, exposes 8080.

## ▶️ Frontend (web)

```powershell
cd frontend
npm install
npm start                         # http://localhost:3000
```

- Dev (`npm start`) uses `frontend/.env` → `REACT_APP_API_URL=` (empty), so `api.js` auto-discovers a local backend on ports 8080–8090.
- With the local backend running on 8081, the discovery probe finds it.

### Tests

```powershell
npm test
```

Existing tests: `src/features/auth/LoginView.test.js`, `src/features/source-income/liquidationUtils.test.js`.

### Production build (web / Vercel)

```powershell
npm run build                     # → build/  (uses .env.production)
```

`frontend/.env.production` sets `REACT_APP_API_URL=https://vsa-backend.onrender.com`. Deploy the `build/` folder to Vercel (root is `/`).

## 🖥️ Desktop (Electron installer)

```powershell
cd frontend
npm run electron:dev              # build + run in Electron (smoke test)
npm run electron:build            # build + package → dist\Verdida-Setup-<version>.exe
```

- Output: `frontend/dist/Verdida-Setup-<version>.exe` (NSIS installer, ~114 MB). **Copy only that single file** to install elsewhere.
- The installer embeds the same `build/` produced by `npm run build` (API = onrender).
- **No auto-update.** For a new release: bump `version` in `frontend/package.json`, then `npm run electron:build`, then send the new `.exe`.

## ⚙️ Environment variables & config files

| Key | Default | Used by | Where the value comes from / set it |
| --- | --- | --- | --- |
| `SPRING_PROFILES_ACTIVE` | `local` | `application.properties` | Render dashboard or launch args |
| `JWT_SECRET` | `dev-secret-change-me` (base/local), `change-me-in-production` (prod) | `JwtProvider` | **Must set in prod** (Render env var); never hardcode a real secret |
| `jwt.expiration` | `86400000` (24 h) | `JwtProvider`, `AuthController` | config file |
| `PORT` | `8080` (base), `8081` (local) | server | Render sets this; override for local |
| `DATABASE_URL` | `jdbc:h2:mem:…` fallback | prod datasource | Render Postgres URL |
| `SPRING_DATASOURCE_URL` / `_USERNAME` / `_PASSWORD` | H2 `sa`/empty fallback | prod datasource | Render env vars |
| `CORS_ORIGINS` | `https://verdidasportsapparel.vercel.app` | `SecurityConfig` | Render env var (comma-separated origins) |
| `app.cors.allow-localhost` | `true` (base/local), `true` (prod, changed) | `SecurityConfig` | config file; desktop app relies on this |
| `SPRING_FLYWAY_ENABLED` | `false` everywhere | Flyway | Render env var — only enable if you intend to run `V2`–`V33` |
| `SPRING_JPA_HIBERNATE_DDL_AUTO` | `update` | JPA | Render env var |
| `APP_BOOTSTRAP_ADMIN_ENABLED` / `_EMAIL` / `_USERNAME` / `_PASSWORD` | off / empty / `admin` / empty | `DataSeeder` | Render env vars (seed first admin) |
| `REACT_APP_API_URL` | `""` (dev), `https://vsa-backend.onrender.com` (prod) | `frontend/src/services/api.js`, `App.js` | `frontend/.env` / `frontend/.env.production` |
| `app.auth.cookie.secure` / `same-site` | prod `true`/`None`, local `false`/`Lax` | `SecurityConfig`, `AuthController` | config files |

**Secrets note:** no real secret values are committed anywhere. Credentials live in the Render dashboard env vars. `frontend/.env.production` only contains the *public* API URL. Never print or commit `JWT_SECRET` / DB passwords / bootstrap admin password.

## 🩺 Common issues

| Symptom | Cause | Fix |
| --- | --- | --- |
| Backend starts but frontend calls fail (CORS) | Origin not allowed; or desktop origin blocked | Add origin to `CORS_ORIGINS`, or ensure `app.cors.allow-localhost=true` for localhost/Electron |
| 401 on POST/PUT/DELETE (writes) but GETs work | Missing/invalid CSRF token | `api.js` fetches `XSRF-TOKEN` automatically; check the cookie + header; watch `[API DEBUG]` logs |
| Login fails for a user | User has no email/password (nullable since V25) | Only users with **email + password** can log in (see [[ADMIN]]) |
| Login says "locked" | 5 failed attempts → 15-min lock (`LoginAttemptService`, in-memory) | Wait 15 min or restart the backend |
| Frontend probes 8080–8090 then still fails | No local backend, and no/incorrect `REACT_APP_API_URL` | Set `REACT_APP_API_URL` for prod; run backend locally for dev |
| Weekly/monthly report looks wrong | Deployed frontend bundle is stale (old UTC date logic) | Rebuild `frontend/build` and redeploy to Vercel |
| Prod restarts and loses all data | `DATABASE_URL` missing → in-memory H2 fallback | Set `DATABASE_URL` (+ user/pass) on Render |
| Desktop app can't reach API | Prod CORS `allow-localhost` false, or backend not redeployed | Set `app.cors.allow-localhost=true` and redeploy backend to Render |
| Flyway validation errors | Schema is JPA-created, no `V1` migration exists | Don't enable Flyway casually; if you do, baseline first (`validate-on-migrate=false`) |
| `admin@verdida.local` login fails outside H2 | That admin is only seeded on H2 local | Use `APP_BOOTSTRAP_ADMIN_*` env on a real DB, or create via the Employees page/API |

## 📎 Related
- [[INDEX]] — map of content
- [[OVERVIEW]] — summary, stack, quick-run
- [[ARCHITECTURE]] — data flow, schema, security model
- [[SETUP]] — this page
- [[ADMIN]] — users, roles, permissions
