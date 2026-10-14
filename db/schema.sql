-- Phase 1 schema: the user system only (users + sessions).
-- Later phases add quizzes, questions, attempts, and power-up tables.

CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  username      VARCHAR(30)  NOT NULL UNIQUE CHECK (username ~ '^[A-Za-z0-9_]{3,30}$'),
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT         NOT NULL,
  role          VARCHAR(10)  NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'admin')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Session storage for connect-pg-simple (express-session).
CREATE TABLE IF NOT EXISTS "session" (
  sid    VARCHAR NOT NULL PRIMARY KEY,
  sess   JSONB   NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_session_expire ON "session" (expire);
