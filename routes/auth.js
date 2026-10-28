// Registration, login, logout, and "who am I".
// The SERVER decides everything - the pages never see a password hash.

const express = require("express");
const router = express.Router();
const pool = require("../db");
const { hashPassword, verifyPassword } = require("../lib/passwords");

// What a valid signup looks like.
function validateRegistration(input) {
  const errors = [];
  const username = String(input.username || "").trim();
  const email = String(input.email || "").trim();
  const password = String(input.password || "");

  if (!/^[a-zA-Z0-9_-]{3,20}$/.test(username)) {
    errors.push("Username: 3-20 letters, numbers, _ or -.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Email: please use a valid email address.");
  }
  if (password.length < 8) {
    errors.push("Password: at least 8 characters.");
  }
  return { errors, username, email, password };
}

// Log the user in: brand-new session id (stops session fixation),
// then remember who they are.
function startSession(req, res, user) {
  req.session.regenerate(() => {
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;
    res.json({ user: { username: user.username, role: user.role } });
  });
}

// Register a new account. The FIRST account ever registered becomes
// the admin - everyone after that is a player.
router.post("/register", async (req, res) => {
  const check = validateRegistration(req.body || {});
  if (check.errors.length) {
    return res.status(400).json({ error: check.errors.join(" ") });
  }
  try {
    const count = await pool.query("SELECT COUNT(*)::int AS n FROM users");
    const role = count.rows[0].n === 0 ? "admin" : "player";
    const passwordHash = await hashPassword(check.password);
    const inserted = await pool.query(
      "INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username, role",
      [check.username, check.email, passwordHash, role]
    );
    startSession(req, res, inserted.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "That username or email is already registered." });
    }
    console.error("Register failed: " + err.message);
    res.status(500).json({ error: "Something went wrong. Try again." });
  }
});

// Log in with a username OR an email, plus the password.
router.post("/login", async (req, res) => {
  const identifier = String((req.body || {}).identifier || "").trim();
  const password = String((req.body || {}).password || "");
  if (!identifier || !password) {
    return res.status(400).json({ error: "Enter your username and password." });
  }
  try {
    const found = await pool.query(
      "SELECT id, username, password_hash, role FROM users WHERE LOWER(username) = LOWER($1) OR email = $1",
      [identifier]
    );
    const user = found.rows[0];
    const ok = user && (await verifyPassword(password, user.password_hash));
    if (!ok) {
      // Same message for a wrong username and a wrong password - no hints.
      return res.status(401).json({ error: "Wrong username or password." });
    }
    startSession(req, res, user);
  } catch (err) {
    console.error("Login failed: " + err.message);
    res.status(500).json({ error: "Something went wrong. Try again." });
  }
});

// Log out.
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

// Who is logged in right now? (user is null when logged out)
router.get("/me", (req, res) => {
  if (!req.session.userId) return res.json({ user: null });
  res.json({ user: { username: req.session.username, role: req.session.role } });
});

module.exports = router;
