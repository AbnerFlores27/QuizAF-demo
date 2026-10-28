// Admin-only API. Players get a plain 403 - the server decides.

const express = require("express");
const router = express.Router();
const pool = require("../db");
const { requireAdmin } = require("../middleware/auth");

// The user list: usernames and roles ONLY - never emails.
router.get("/users", requireAdmin, async (req, res) => {
  try {
    const list = await pool.query(
      "SELECT username, role, created_at FROM users ORDER BY created_at"
    );
    res.json({ users: list.rows });
  } catch (err) {
    console.error("User list failed: " + err.message);
    res.status(500).json({ error: "Something went wrong. Try again." });
  }
});

module.exports = router;
