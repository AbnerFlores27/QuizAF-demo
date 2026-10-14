// Phase 1 API: registration, login, logout, and "who am I".
const express = require("express");
const { pool } = require("../db/index");
const { hashPassword, verifyPassword } = require("../lib/passwords");

const router = express.Router();

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,30}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function logIn(request, response, user, successStatus) {
  // Fresh session id on every login (standard session-fixation protection).
  request.session.regenerate((error) => {
    if (error) {
      console.error("Session regenerate failed:", error.message);
      return response.status(500).json({ error: "Could not start your session. Try logging in." });
    }
    request.session.userId = user.id;
    request.session.save((saveError) => {
      if (saveError) {
        console.error("Session save failed:", saveError.message);
        return response.status(500).json({ error: "Could not start your session. Try logging in." });
      }
      response
        .status(successStatus)
        .json({ user: { id: user.id, username: user.username, role: user.role } });
    });
  });
}

router.post("/register", async (request, response) => {
  const body = request.body || {};
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!USERNAME_PATTERN.test(username)) {
    return response.status(400).json({ error: "Username must be 3-30 letters, numbers, or underscores." });
  }
  if (!EMAIL_PATTERN.test(email) || email.length > 255) {
    return response.status(400).json({ error: "Enter a valid email address." });
  }
  if (password.length < 8 || password.length > 200) {
    return response.status(400).json({ error: "Password must be at least 8 characters." });
  }

  try {
    const { rows } = await pool.query(
      "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, role",
      [username, email, hashPassword(password)],
    );
    logIn(request, response, rows[0], 201);
  } catch (error) {
    if (error.code === "23505") {
      // 23505 = unique constraint violation: username or email already taken.
      return response.status(409).json({ error: "That username or email is already registered." });
    }
    console.error("Register failed:", error.message);
    response.status(500).json({ error: "Could not create the account. Try again." });
  }
});

router.post("/login", async (request, response) => {
  const body = request.body || {};
  const identifier = typeof body.identifier === "string" ? body.identifier.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!identifier || !password) {
    return response.status(400).json({ error: "Enter your username (or email) and password." });
  }

  try {
    const { rows } = await pool.query(
      "SELECT id, username, role, password_hash FROM users WHERE LOWER(username) = LOWER($1) OR email = $1",
      [identifier.toLowerCase()],
    );
    const user = rows[0];

    // Same generic message either way: never reveal which part was wrong.
    if (!user || !verifyPassword(password, user.password_hash)) {
      return response.status(401).json({ error: "Invalid username or password." });
    }

    logIn(request, response, user, 200);
  } catch (error) {
    console.error("Login failed:", error.message);
    response.status(500).json({ error: "Could not log in. Try again." });
  }
});

router.post("/logout", (request, response) => {
  request.session.destroy((error) => {
    if (error) {
      console.error("Logout failed:", error.message);
      return response.status(500).json({ error: "Could not log out. Try again." });
    }
    response.clearCookie("quiz.sid");
    response.json({ ok: true });
  });
});

router.get("/me", async (request, response) => {
  if (!request.session || !request.session.userId) {
    return response.json({ user: null });
  }
  try {
    const { rows } = await pool.query(
      "SELECT id, username, role FROM users WHERE id = $1",
      [request.session.userId],
    );
    response.json({ user: rows[0] || null });
  } catch (error) {
    console.error("Me lookup failed:", error.message);
    response.status(500).json({ error: "Something went wrong." });
  }
});

module.exports = router;
