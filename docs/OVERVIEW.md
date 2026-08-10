# OVERVIEW — Verdida Sports Apparel (VSA)

## One paragraph

VSA is a cloud ERP for a sports apparel retail shop. A React single-page app (frontend) talks to a Spring Boot REST API (backend) secured by JWT + CSRF. Staff manage inventory, order forms (inventory orders and customized orders with per-player items), clients, source-of-income records (payment tracking), employees (users), and daily attendance. The backend stores everything in PostgreSQL (prod) or an in-memory H2 database (local dev), with the API deployed on Render and the web frontend on Vercel. A desktop variant packages the frontend as a Windows `.exe` (Electron) that still talks to the cloud backend.

## 🧱 Tech stack

| Layer | Technology | Where |
| --- | --- | --- |
| Frontend | React 19, Create React App (react-scripts 5.0.1), react-router-dom 6, axios | `frontend/` |
| Frontend tests | @testing-library/react, jest (via react-scripts) | `frontend/src/**/*.test.js` |
| Desktop | Electron + electron-builder (NSIS) | `frontend/electron/`, `frontend/electron-builder.yml` |
| Backend | Spring Boot 4.0.6, Java 17, Maven | `backend/backend/` |
| Persistence | Spring Data JPA / Hibernate, Flyway (disabled by default), PostgreSQL + H2 (dev/fallback) | `backend/backend/src/main/java`, `src/main/resources` |
| Security | Spring Security, JJWT 0.12.5 (HS512), BCrypt, cookie CSRF | `backend/backend/.../security/`, `config/SecurityConfig.java` |
| API docs | springdoc-openapi 3.0.2 (disabled in prod) | — |
| Other | Lombok, Actuator, devtools | — |
| Deploy | Vercel (web frontend), Render (backend API + Postgres) | see [[SETUP]] |

## ✨ Features

- **Dashboard** — stats endpoint `GET /api/dashboard/stats` (any authenticated user).
- **Inventory** — CRUD items (`/api/inventory`), type filter, name search, low-stock list.
- **Inventory Orders** — CRUD orders with per-item size/number/jersey, job-order numbers, payment updates (`/api/orders`).
- **Customized Orders** — same shape as orders but with customized items, teams, per-player lists (`/api/customized-orders`, `/api/teams`).
- **Clients** — CRUD + VIP flag + search (`/api/clients`).
- **Source of Income / Finance** — income records with shop, payment method, client, job order no., reference/check numbers, remarks (`/api/income`).
- **Employees (Users)** — admin-managed users with roles + per-page permissions (`/api/users`, `/api/permissions`). Admin UI lives under the Employees page.
- **Attendance** — daily time-in/time-out records per user (`/api/attendance`).
- **Auth** — email+password login, JWT (bearer + httpOnly cookie), CSRF double-submit, login rate limiting.
- **Excel exports** — income/orders views export to `.xlsx` (client-side).

## 🗂️ Folder layout

```
Verdida Sports Apparel/
├── pom.xml                         # Maven aggregator → module backend/backend
├── README.md                       # short security notes
├── AGENTS.md                       # AI/agent quick context
├── docs/                           # Obsidian documentation (this vault)
│   ├── INDEX.md  OVERVIEW.md  ARCHITECTURE.md  SETUP.md  ADMIN.md
├── backend/
│   └── backend/
│       ├── pom.xml
│       ├── Dockerfile              # multi-stage: maven build → temurin-17 JRE, runs prod profile
│       ├── mvnw, mvnw.cmd
│       └── src/main/
│           ├── java/sports/apparel/backend/
│           │   ├── BackendApplication.java
│           │   ├── config/         # SecurityConfig, DataSeeder, PingController
│           │   ├── entity/         # JPA entities (12)
│           │   ├── exception/      # ApiError, GlobalExceptionHandler
│           │   ├── features/       # per-domain: auth, users, orders, customizedorders,
│           │   │                   #   inventory, clients, income, teams, attendance, dashboard
│           │   ├── security/       # JwtProvider, JwtAuthenticationFilter, CustomUserDetailsService
│           │   └── support/        # IdempotencyService
│           └── resources/
│               ├── application.properties        # base config, H2, JWT, CORS
│               ├── application-local.properties  # local profile: port 8081, allow-localhost
│               ├── application-prod.properties   # prod profile: Render/Postgres, secure cookies
│               └── db/migration/    # Flyway V2..V33 (Flyway off by default; no V1!)
├── frontend/
│   ├── package.json                # CRA scripts + electron scripts
│   ├── .env                        # REACT_APP_API_URL= (empty → dev discovery)
│   ├── .env.production             # REACT_APP_API_URL=https://vsa-backend.onrender.com
│   ├── electron/                   # main.js, preload.js
│   ├── electron-builder.yml        # NSIS installer config
│   ├── public/                     # index.html, logo, manifest
│   └── src/
│       ├── App.js                  # router + routes + permission guards
│       ├── index.js
│       ├── components/             # DataTable, Modal, Navbar, Sidebar, guards
│       ├── context/                # AuthContext, NotificationContext
│       ├── features/               # per-page views (dashboard, orders, income, …)
│       ├── layouts/                # DashboardLayout
│       ├── services/               # api.js (axios + discovery + CSRF), per-domain services
│       ├── styles/                 # CSS files
│       └── utils/                  # permissions.js, apiErrors.js
└── scripts/remove-bom.js           # BOM cleanup helper (root)
```

## ⚡ Quick-run commands

**Backend (local, H2, port 8081):**
```powershell
cd backend/backend
.\mvnw.cmd spring-boot:run          # or: .\mvnw.cmd test, .\mvnw.cmd clean package
```

**Frontend (dev, port 3000):**
```powershell
cd frontend
npm install
npm start
```

**Desktop installer:**
```powershell
cd frontend
npm run electron:build              # → dist\Verdida-Setup-<version>.exe
```

Full details, env vars, and troubleshooting: [[SETUP]].

## 📎 Related
- [[INDEX]] — map of content
- [[OVERVIEW]] — this page
- [[ARCHITECTURE]] — data flow, schema, security model
- [[SETUP]] — running and deploying
- [[ADMIN]] — users, roles, permissions
