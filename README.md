# VSA-web

Security notes:

- Set `JWT_SECRET` in your environment before starting the backend.
- If you want an initial admin on a fresh database, set `APP_BOOTSTRAP_ADMIN_ENABLED=true` plus `APP_BOOTSTRAP_ADMIN_EMAIL` and `APP_BOOTSTRAP_ADMIN_PASSWORD`.
- Local runs now auto-seed a dev admin on H2: `admin@verdida.local` / `Admin123!`.
- Swagger and actuator are now restricted in the backend security config.
