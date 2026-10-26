-- Phase 1 schema: the user system (users + sessions) plus the admin
-- access log. Phase 2 adds the quizzes + questions tables.
-- Later phases add attempt history and power-up tables.

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

-- Every attempt to reach an admin-only route gets recorded here,
-- allowed or denied. The real admin sees the list in the Control Room.
CREATE TABLE IF NOT EXISTS admin_access_log (
  id         BIGSERIAL PRIMARY KEY,
  username   VARCHAR(64),
  endpoint   VARCHAR(100) NOT NULL,
  allowed    BOOLEAN      NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Phase 2 schema: the 5 quizzes + their questions.
-- The 5 quizzes match the 5 arcade cabinets on GAME SELECT.
-- ============================================================
CREATE TABLE IF NOT EXISTS quizzes (
  id   INT         PRIMARY KEY,
  name VARCHAR(50) NOT NULL
);

-- The correct answer lives ONLY in the database: the API never sends
-- it to the browser, and the server does all the grading.
CREATE TABLE IF NOT EXISTS questions (
  id             BIGSERIAL    PRIMARY KEY,
  quiz_id        INT          NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text  VARCHAR(300) NOT NULL,
  choice_a       VARCHAR(150) NOT NULL,
  choice_b       VARCHAR(150) NOT NULL,
  choice_c       VARCHAR(150) NOT NULL,
  choice_d       VARCHAR(150) NOT NULL,
  correct_answer CHAR(1)      NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D'))
);

CREATE INDEX IF NOT EXISTS idx_questions_quiz ON questions (quiz_id);
