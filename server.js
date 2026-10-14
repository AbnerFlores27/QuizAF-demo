const express = require("express");
const path = require("node:path");
const session = require("express-session");
const connectPgSimple = require("connect-pg-simple");

const { pool } = require("./db/index");
const { ensureSchema } = require("./db/setup");
const authRouter = require("./routes/auth");
const adminRouter = require("./routes/admin");

const app = express();
const port = Number(process.env.PORT || 5000);

// Replit serves the app behind a proxy; this keeps secure cookies working.
app.set("trust proxy", 1);

app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));
app.use(express.static(path.join(__dirname, "public")));

// Sessions are stored in PostgreSQL, so logins survive a server restart.
if (!process.env.SESSION_SECRET) {
  console.warn(
    "SESSION_SECRET is not set (add it in Replit Secrets). Using a temporary dev secret - logins will not survive a restart.",
  );
}

const PGStore = connectPgSimple(session);
app.use(
  session({
    name: "quiz.sid",
    secret: process.env.SESSION_SECRET || "dev-secret-set-SESSION_SECRET-in-Replit",
    resave: false,
    saveUninitialized: false,
    store: new PGStore({ pool, tableName: "session" }),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // one week
    },
  }),
);

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.get("/api/db/example", async (request, response) => {
  const text = typeof request.query.text === "string" ? request.query.text.trim() : "";

  if (!text) {
    return response.status(400).json({ error: "Provide a non-empty text query parameter." });
  }

  if (text.length > 200) {
    return response.status(400).json({ error: "Text must be 200 characters or fewer." });
  }

  try {
    const result = await pool.query(
      "SELECT $1::text AS message, CURRENT_TIMESTAMP AS queried_at",
      [text],
    );

    return response.json(result.rows[0]);
  } catch (error) {
    console.error("PostgreSQL query failed:", error);
    return response.status(503).json({ error: "Unable to query PostgreSQL right now." });
  }
});

// Phase 1: authentication + admin-only routes.
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);

app.use("/api", (_request, response) => {
  response.status(404).json({ error: "API route not found." });
});

// Make sure the users + session tables exist before accepting requests.
ensureSchema()
  .then(() => {
    app.listen(port, "0.0.0.0", () => {
      console.log("Server listening on 0.0.0.0:" + port);
      console.log("Phase 1 QA pages: /register.html and /login.html");
    });
  })
  .catch((error) => {
    console.error("Could not prepare the database:", error.message);
    process.exit(1);
  });
