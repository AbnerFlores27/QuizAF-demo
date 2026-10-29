# California Sports Quiz

A quiz website for a high school web development class. All five quizzes
are about California sports: California teams and California sports
history. Phase 1 is the foundation: accounts and login (register, log
in, log out, player and admin roles).

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

## Phase 2: quizzes

Five sports quizzes (Basketball, Football, Soccer, Baseball, Olympics)
with 10 California sports questions each. Questions come from
`templates/questions.csv`; the server reloads them from the CSV at
every startup, so updated questions just need a restart (`npm run
seed-questions` also works). Answers are graded by the SERVER - the
browser never sees a correct answer before submitting.

## Phase 3: attempt history

Every FINISHED quiz is saved to the `attempts` table (user, quiz,
score, question count, timestamp). The My history page shows only YOUR
attempts - private to each player. Retrying a quiz makes a new record.
Unfinished quizzes are never saved, so they never count.
