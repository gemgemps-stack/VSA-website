# ADMIN — Users, roles, permissions & production do's / don'ts

## 🔑 How authentication works (summary)

- Login = `POST /api/auth/login` with `username` + `password` (rate-limited).
- On success the backend returns a **JWT** (24 h expiry) and sets the httpOnly cookie **`VSA_AUTH`**; the frontend also stores the token in `localStorage` under `verdida:accessToken` and the current user under `verdida:currentUser`.
- On app load, `AuthContext` calls `GET /api/auth/csrf` then `GET /api/auth/me` to restore the session.
- Every subsequent request sends the JWT (cookie or `Authorization: Bearer`), plus `X-XSRF-TOKEN` for unsafe methods.
- Session is **stateless**; there is no "logout server-side" — `POST /api/auth/logout` just clears the cookie/client state.

## 🎭 Roles

| Role | Meaning (from `User.Role` enum) |
| --- | --- |
| `ADMIN` | Full access; the only role that can manage users/permissions; gate to Swagger + Actuator |
| `EMPLOYEE` | General staff; access depends on granted **permissions** |
| `MARKETING` | Staff; access depends on granted permissions |
| `PRODUCTION` | Staff; access depends on granted permissions |
| `SEWING` | Staff; access depends on granted permissions |

Roles alone don't grant feature access (except `ADMIN`). Feature access is granted per-user via **permissions**.

## 🗂️ Permissions

Permissions are per-user rows in the `permissions` table (`user_id` + `page_name`). They map 1:1 to pages and become the Spring authorities on each request.

| `page_name` | Page / feature | Backend authority examples |
| --- | --- | --- |
| `INVENTORY_ORDERS` | Orders page (`/orders`) | `hasAnyAuthority('ADMIN','INVENTORY_ORDERS','ORDERS')` |
| `CUSTOMIZED_ORDERS` | Customized orders page (`/customized-orders`) | `hasAnyAuthority('ADMIN','CUSTOMIZED_ORDERS','ORDERS')` |
| `TEAMS` | Teams (`/api/teams`) | `hasAnyAuthority('ADMIN','TEAMS','ORDERS')` |
| `INVENTORY` | Inventory page (`/api/inventory`) | `hasAnyAuthority('ADMIN','INVENTORY')` |
| `CLIENTS` | Clients page (`/api/clients`) | `hasAnyAuthority('ADMIN','CLIENTS')` |
| `SOURCE_OF_INCOME` | Finance/income page (`/api/income`) | `hasAnyAuthority('ADMIN','SOURCE_OF_INCOME')` |
| `ATTENDANCE` | Attendance page (`/api/attendance`) | `hasAnyAuthority('ADMIN','ATTENDANCE')` |
| (derived) `EMPLOYEES` | Employees/user-management page | `hasRole('ADMIN')` |

- Grant/revoke via UI (Employees page) or API: `POST /api/permissions/grant/{userId}/{pageName}` and `DELETE /api/permissions/revoke/{userId}/{pageName}` (both require ADMIN).
- Read your own permissions: `GET /api/permissions/{userId}` (self or ADMIN).
- Frontend treats these aliases as the same permission: `INVENTORY_ORDERS` ⇔ `ORDERS`, `CUSTOMIZED_ORDERS` ⇔ `ORDERS`, `SOURCE_OF_INCOME` ⇔ `PAYMENT_METHODS` (`frontend/src/utils/permissions.js`).
- `DataSeeder.DEFAULT_ADMIN_PERMISSIONS` = `INVENTORY_ORDERS, CUSTOMIZED_ORDERS, TEAMS, INVENTORY, CLIENTS, SOURCE_OF_INCOME, EMPLOYEES, ATTENDANCE` — used when seeding an admin.

## 👤 Managing users

- Create: `POST /api/users` (ADMIN). Rules (`CreateUserRequest` + `UserService`): `username` 3–100 chars, **unique**; `email` must be valid (`@Email`); `password` min 6 chars; `role` required and must be a valid enum value; `salary` must be > 0 when provided.
- **ADMIN users require `email` + `password`.** Non-admin users may be created *without* email/password (nullable since migration `V25`), but **such users cannot log in** (login requires both). If you want a non-admin to log in, give them an email + password.
- Update: `PUT /api/users/{id}` (ADMIN or self).
- Delete: `DELETE /api/users/{id}` (ADMIN).
- View: `GET /api/users` (ADMIN), `GET /api/users/{id}` (self or ADMIN), `GET /api/users/username/{username}` (self or ADMIN).
- The Employees page in the UI is the admin surface for all of the above.

## 🚀 Seeding the first admin on a fresh (non-H2) database

Set these env vars on Render **before** first boot, then restart:

```
APP_BOOTSTRAP_ADMIN_ENABLED=true
APP_BOOTSTRAP_ADMIN_EMAIL=<email>
APP_BOOTSTRAP_ADMIN_USERNAME=<username>     # default: admin
APP_BOOTSTRAP_ADMIN_PASSWORD=<strong password>
```

`DataSeeder` creates the user (role `ADMIN`) with all default permissions if it doesn't already exist, then leaves it alone. With the H2 local profile, this runs automatically with `admin@verdida.local` / `Admin123!`.

## 🚫 Production DO-NOTs (grounded in code)

1. **Do NOT run with the default JWT secret.** `JwtProvider` derives the signing key by SHA-512-hashing `jwt.secret`; prod fallback is `change-me-in-production`. Anyone with the secret can forge tokens and log in as **any** user, including ADMIN. Always set `JWT_SECRET` (long random string) in the Render dashboard.
2. **Do NOT enable bootstrap admin without setting the env vars.** If `app.bootstrap-admin.enabled=true` but email/password are empty, the seeder cannot create a usable admin (ADMIN requires email + password). Set all four `APP_BOOTSTRAP_ADMIN_*` values.
3. **Do NOT skip `DATABASE_URL`.** Prod falls back to in-memory H2; every restart wipes all data.
4. **Do NOT disable CSRF protections** for unsafe methods. Cookies in prod are `Secure` + `SameSite=None`; keep `withCredentials` on the axios instance.
5. **Do NOT hand out `ADMIN`** to staff who only need one page — grant the narrow `page_name` permission instead.
6. **Do NOT enable Flyway casually** — there is no `V1` schema migration (schema is Hibernate-created); running `V2`–`V33` against an un-baselined DB will fail validation. See [[SETUP]] troubleshooting.
7. **Do NOT deploy the frontend without rebuilding** — Vercel serves whatever `build/` was uploaded; stale bundles (e.g. old UTC date logic) keep shipping until you redeploy.

## 🔍 Operational quick reference

- Health (public): `GET /api/auth/health`, `GET /ping`, `GET /actuator/health`.
- Actuator (ADMIN only): `GET /actuator/**`; **disabled** `info`/`health` details in prod (only `health,info` exposed).
- Swagger (ADMIN only, disabled in prod): `/swagger-ui.html`, `/v3/api-docs/**`.
- Idempotency: write endpoints dedupe by `request_fingerprint`; a retried identical request returns the stored result instead of double-creating.

## 📎 Related
- [[INDEX]] — map of content
- [[OVERVIEW]] — summary, stack, quick-run
- [[ARCHITECTURE]] — data flow, schema, security model
- [[SETUP]] — running and deploying
- [[ADMIN]] — this page
