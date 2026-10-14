// Admin-only routes. Phase 1 ships a read-only roster to prove role restrictions.
const express = require("express");
const { pool } = require("../db/index");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.use(requireAdmin);

// Lists usernames and roles only - never emails (privacy rule).
router.get("/users", async (_request, response) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, username, role, created_at FROM users ORDER BY created_at ASC",
    );
    response.json({ users: rows });
  } catch (error) {
    console.error("Admin users failed:", error.message);
    response.status(500).json({ error: "Could not load users." });
  }
});

module.exports = router;
