// California Sports Quiz - Phase 1: accounts and login.
// A clean Express server: it serves the pages in public/ and the
// small JSON API under /api/. Login sessions live in Postgres.

const express = require("express");
const session = require("express-session");
const pgSession = require("connect-pg-simple");
const path = require("path");
const fs = require("fs");

const pool = require("./db");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const quizRoutes = require("./routes/quiz");
const leaderboardRoutes = require("./routes/leaderboard");
const { loadQuestions } = require("./db/seed-questions");

const app = express();

// Replit serves the app behind its proxy - this keeps secure login
// cookies working (the old working version had this line).
app.set("trust proxy", 1);

if (!process.env.SESSION_SECRET) {
  console.warn("WARNING: SESSION_SECRET is not set in Secrets. Logins still work, but set it before the final version.");
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Login sessions. Replit shows the site inside its preview window,
// which counts as a cross-site context - "lax" cookies get dropped
// there, so a login can look successful but never stick. "none" +
// secure is the combination that works in Replit and everywhere.
app.use(
  session({
    store: new (pgSession(session))({ pool: pool }),
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    rolling: true, // using the site refreshes the login
    cookie: {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // one week
    },
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/leaderboard", leaderboardRoutes);

// Any other /api/ path is a typo, not a missing page.
app.use("/api", (req, res) => {
  res.status(404).json({ error: "API route not found." });
});

const PORT = Number(process.env.PORT || 5000);

async function start() {
  // Make sure the tables exist before the first request comes in.
  const schemaSql = fs.readFileSync(path.join(__dirname, "db", "schema.sql"), "utf8");
  await pool.query(schemaSql);
  // Phase 4: the DATABASE is now the source of truth for questions.
  // The CSV only fills the questions table when it is EMPTY, so edits
  // made with the admin question editor survive a server restart.
  try {
    const count = await pool.query("SELECT COUNT(*)::int AS n FROM questions");
    if (count.rows[0].n === 0) {
      const loaded = await loadQuestions(pool);
      console.log("Loaded " + loaded + " quiz questions automatically.");
    } else {
      console.log("Questions already in the database: " + count.rows[0].n + ". Keeping them (admin edits stick).");
    }
  } catch (err) {
    console.error("Could not check the questions table: " + err.message);
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log("Phase 1 running: register, log in, log out.");
    console.log("Phase 3 running: finished quizzes save to your history.");
    console.log("Phase 4 running: leaderboards + admin question editor.");
    console.log("SERVER CODE: PHASE4. If you can read this line, Phase 4 is running.");
  });
}

start().catch((err) => {
  console.error("Could not start: " + err.message);
  process.exit(1);
});
