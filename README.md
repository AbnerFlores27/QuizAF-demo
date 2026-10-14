# SUPER QUIZ - Abner's Quiz Site

Author: Abner Flores
Birthday: May 21st 2012

A plain HTML, CSS, and JavaScript app served by Express 5 on Node.js 24, with PostgreSQL through the pg library (parameterized SQL only).

## Run

    npm install
    npm start

Development with automatic server restarts:

    npm run dev

## Phase 1 - Foundation & authentication

This branch (phase-1-foundation-auth) adds the user system:

- users + session tables (db/schema.sql; applied automatically at startup, safe to re-run)
- Registration, login, logout pages (public/register.html, public/login.html)
- Passwords hashed with Node's built-in scrypt (lib/passwords.js). Plaintext is never stored or logged
- Sessions stored in PostgreSQL, so logins survive a server restart
- Player vs admin roles, checked server-side on every admin route
- Teacher/admin account seeded from Replit Secrets (db/seed-admin.js, idempotent)

### First-time setup (Replit workspace = QA)

1. npm install
2. In Replit Secrets, add: SESSION_SECRET (any long random string) and ADMIN_PASSWORD (the teacher's initial password). Optional: ADMIN_USERNAME (default: teacher)
3. npm run seed
4. npm start

### Phase 1 API

- POST /api/auth/register - create account (username, email, password)
- POST /api/auth/login - log in (identifier = username or email, plus password)
- POST /api/auth/logout - destroy the session
- GET /api/auth/me - current user or null
- GET /api/admin/users - admin-only roster (players get 403)
- GET /api/health - health check
- GET /api/db/example?text=... - starter database example (parameterized query)

## Database example

Open the home page and submit text to run a PostgreSQL query. The API uses a bound parameter:

    pool.query(
      "SELECT $1::text AS message, CURRENT_TIMESTAMP AS queried_at",
      [text],
    );

The database health/query endpoint is GET /api/db/example?text=...

## Environments

The Replit workspace is QA. Production deployment happens in Phase 5 only, with a separate production database.
