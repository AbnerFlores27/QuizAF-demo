# Abner's Quiz Site

A quiz website for a high school web development class. Phase 1 is the
foundation: accounts and login (register, log in, log out, player and
admin roles).

## Run it

1. `npm install`
2. Set the `DATABASE_URL` and `SESSION_SECRET` secrets (Replit Secrets tool)
3. `npm start` (the tables are created automatically)

The FIRST account registered becomes the admin. Every account after
that is a player. `npm run reset` wipes the tables for a clean slate.

## Phase 1 features

- Express server + static pages in `public/`
- Postgres: `users` table + `session` table (login sessions)
- Register / log in / log out
- Passwords hashed with scrypt - never stored in plain text
- Roles: `player` and `admin`; admin-only pages block players with 403
