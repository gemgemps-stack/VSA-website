# ARCHITECTURE — Verdida Sports Apparel (VSA)

## 🌊 High-level data flow

```
 Browser (Vercel web)  ──┐
 Electron desktop app  ──┤   HTTPS
 (http://127.0.0.1:PORT)  └──▶ https://vsa-backend.onrender.com  (Spring Boot, prod profile)
                                │
                                ├── JPA / Hibernate (ddl-auto=update)
                                └── PostgreSQL (Render) — falls back to in-memory H2 if DATABASE_URL unset
```

1. The React app resolves its API base URL once (`discoverApiBaseUrl` in `frontend/src/services/api.js`):
   - If the page host is `localhost`/`127.0.0.1` **and** no `REACT_APP_API_URL` is set, it probes `http://localhost:8080`…`8090` (`GET /api/auth/health`) and uses the first that responds.
   - Otherwise it uses `REACT_APP_API_URL` (prod: `https://vsa-backend.onrender.com`).
2. All requests go through one axios instance (`api.js`) with `withCredentials: true`:
   - unsafe methods (POST/PUT/DELETE/PATCH) fetch `GET /api/auth/csrf` and attach the token as `X-XSRF-TOKEN`;
   - the JWT from `localStorage` (`verdida:accessToken`) is attached as `Authorization: Bearer <token>`.
3. The backend authenticates (JWT filter), enforces `@PreAuthorize` role/permission checks, performs the work, and returns JSON.
4. Frontend routes are protected by `ProtectedRoute` (auth) + `PermissionGuard` (permission) in `frontend/src/App.js`.

## 🧩 Backend module layout (package `sports.apparel.backend`)

- `config/` — `SecurityConfig` (filter chain, CORS, CSRF), `DataSeeder` (bootstrap admin + local admin seed), `PingController`.
- `entity/` — 12 JPA entities: `User`, `Permission`, `Client`, `Order`, `OrderItem`, `CustomizedOrder`, `CustomizedOrderItem`, `Inventory`, `IncomeSource`, `Team`, `TeamPlayer`, `EmployeeAttendance`.
- `features/<domain>/` — controller + service + DTO(s) + repository + request classes per feature: `auth`, `users`, `orders`, `customizedorders`, `inventory`, `clients`, `income`, `teams`, `attendance`, `dashboard`.
- `security/` — `JwtProvider` (HS512, HMAC key derived from `jwt.secret` via SHA-512), `JwtAuthenticationFilter` (reads Bearer header **or** `VSA_AUTH` cookie), `CustomUserDetailsService` (email lookup + role/permission authorities).
- `exception/` — `GlobalExceptionHandler`, `ApiError`.
- `support/` — `IdempotencyService` (in-memory dedup of concurrent/duplicate requests).

Base path: `server.servlet.context-path=/`. All feature endpoints are under `/api`.

## 🗄️ Database schema (tables from entities; JPA `ddl-auto=update`)

> Flyway is **disabled by default** (`SPRING_FLYWAY_ENABLED=false` in every profile). There is **no `V1` migration** — tables are created by Hibernate. Migrations `V2`–`V33` in `src/main/resources/db/migration/` only alter an existing schema and only run when Flyway is explicitly enabled.

| Table | Key columns / notes |
| --- | --- |
| `users` | `id` (UUID), `username` (unique), `email` (unique, **nullable** since V25), `password` (**nullable** since V25), `role` enum: `ADMIN, EMPLOYEE, MARKETING, PRODUCTION, SEWING`, `salary`, `version` (@Version), `created_at` |
| `permissions` | `id`, `user_id` FK→users, `page_name` (e.g. `INVENTORY_ORDERS`, `CUSTOMIZED_ORDERS`, `TEAMS`, `INVENTORY`, `CLIENTS`, `SOURCE_OF_INCOME`, `ATTENDANCE`) |
| `clients` | `id`, `client_code` (unique), `client_name`, `contact_number`, `vip`, `notes`, `created_at` |
| `orders` | `id`, `job_order_no` (unique), `request_fingerprint` (unique, idempotency), `client_id` FK (nullable), `client_name`, `team_name`, `order_retail`, `quantity`, `freebie`, `discount`, `price`, `down_payment`, `shop`, `order_date`, `mode_of_payment`, `remarks`, `reference_number`, `status`, `inventory_deducted`, `version`, `created_at` |
| `order_items` | `id`, `order_id` FK, `product_name`, `size`, `number`, `jersey_type`, `unit_price`, `quantity` |
| `customized_orders` | same core columns as `orders` (minus `inventory_deducted`) |
| `customized_order_items` | `id`, `customized_order_id` FK, `product_name`, `size`, `unit_price`, `quantity` |
| `inventory` | `id`, `item_type`, `jersey_type`, `name`, `shop`, `size`, `number`, `notes`, `quantity`, `price`, `created_at` |
| `income_sources` | `id`, `shop_type`, `payment_method`, `income_date`, `client_id` FK (nullable), `client_code`, `client_name`, `job_order_no`, `amount`, `reference_number`, `check_number`, `payment_category`, `remarks`, `created_at` |
| `teams` | `id`, `team_name` (unique), `quantity`, `transit_date`, `created_at` |
| `team_players` | `id`, `team_id` FK, `surname`, `number`, `size`, `type` |
| `employee_attendance` | `id`, `user_id` FK, `attendance_date`, `request_fingerprint` (unique), `time_in`, `time_out`, `status`, `notes`, `version`, `created_at`, `updated_at`; unique `(user_id, attendance_date)` |

All primary keys are UUIDs (`GenerationType.UUID`).

## 🔐 Security model

- **JWT**: HS512, signed with an HMAC key derived by SHA-512-hashing `jwt.secret` (`JwtProvider.getSigningKey()`). Expiry `jwt.expiration=86400000` (24 h). `jwt.secret` must come from `JWT_SECRET` env in prod.
- **Stateless**: `SessionCreationPolicy.STATELESS`; no server session.
- **Token delivery (two ways, `JwtAuthenticationFilter`)**: `Authorization: Bearer <token>` **or** httpOnly cookie `VSA_AUTH`.
- **CSRF**: `CookieCsrfTokenRepository.withHttpOnlyFalse()` — cookie `XSRF-TOKEN`, header `X-XSRF-TOKEN`. CSRF is **ignored** for `POST /api/auth/login`, `GET /api/auth/health`, `GET /api/auth/csrf`. Prod: cookie `Secure` + `SameSite=None`; local: `Secure=false` + `SameSite=Lax`.
- **Authorization**: `@PreAuthorize` on every controller method using `hasRole('ADMIN')`, `hasAuthority('<PAGE_NAME>')`, or `hasAnyAuthority(...)`. Authorities = `ROLE_<role>` + each permission `page_name` (from `CustomUserDetailsService`).
- **CORS** (`SecurityConfig.corsConfigurationSource`): `allowCredentials=true`; allowed origins from `app.cors.origins` (+ `http://localhost:*` and `http://127.0.0.1:*` when `app.cors.allow-localhost=true`); allowed headers include `X-XSRF-TOKEN`, `Authorization`, etc.
- **Login rate limiting** (`LoginAttemptService`): in-memory `ConcurrentHashMap`; 5 failed attempts → locked 15 min; keys are `email|ip` and `ip|ip`.
- **Passwords**: BCrypt via `BCryptPasswordEncoder`; login also tolerates legacy plaintext `{bcrypt}`/`$2a$…` forms (`AuthService.passwordMatches`).
- **Admin bootstrap** (`DataSeeder`): when `app.bootstrap-admin.enabled=true` (or `local` profile + H2), seeds an `ADMIN` user with all `DEFAULT_ADMIN_PERMISSIONS` if the email/username doesn't exist yet. Local dev seed: `admin@verdida.local` / `Admin123!`.

## 🌐 Frontend ↔ backend wiring

- `frontend/src/services/api.js` — single axios instance; base-URL discovery; CSRF attach; Bearer attach; `DEBUG_API_REQUESTS=true` debug logging.
- Per-domain service modules (`orderService.js`, `incomeService.js`, …) call `api.<verb>('/api/...')`.
- `frontend/src/App.js` — routes: `/login`, `/dashboard`, `/orders` (INVENTORY_ORDERS), `/customized-orders` (CUSTOMIZED_ORDERS), `/inventory` (INVENTORY), `/clients` (CLIENTS), `/income` (SOURCE_OF_INCOME), `/employees` (EMPLOYEES), `/attendance` (ATTENDANCE); `/teams` and `/payment-methods` redirect.
- `frontend/src/context/AuthContext.js` — on load: `GET /api/auth/csrf`, then `GET /api/auth/me` to restore the session from `localStorage`.
- Frontend permission aliases (`utils/permissions.js`) map legacy names: `ORDERS` ⇒ `INVENTORY_ORDERS`+`CUSTOMIZED_ORDERS`, `PAYMENT_METHODS` ⇔ `SOURCE_OF_INCOME`.
- Keep-alive ping: `frontend/src/App.js` pings `GET /ping` every 10 minutes when `REACT_APP_API_URL` is set (keeps the Render free instance warm).

## 🖥️ Desktop (Electron) wiring

- `frontend/electron/main.js` — starts a local Node HTTP server on `127.0.0.1:<random-port>` serving `frontend/build/` (SPA fallback to `index.html`), then opens a `BrowserWindow` at that origin. Bound to localhost only; `contextIsolation` on, `nodeIntegration` off, `sandbox` on.
- Origin is `http://127.0.0.1:<random-port>` — matched by the `app.cors.allow-localhost=true` patterns, and cookies/CSRF work because prod cookies are `SameSite=None`.
- `frontend/electron-builder.yml` — NSIS x64 installer → `dist\Verdida-Setup-<version>.exe`; `extends: null` (disables the react-cra preset). No auto-update.

## 📎 Related
- [[INDEX]] — map of content
- [[OVERVIEW]] — summary, stack, quick-run
- [[ARCHITECTURE]] — this page
- [[SETUP]] — running and deploying
- [[ADMIN]] — auth details, users, roles, permissions
