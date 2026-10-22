// Admin-only routes. The server decides who is an admin - never the client.
// Phase 1 ships the roster, role switching, and the access log
// (all served from the Control Room panel).
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

// Change a player into an admin, or back into a player.
// Guard rails:
//  - only admins ever reach this route (requireAdmin above)
//  - the new role must literally be "player" or "admin"
//  - an admin can never flip their OWN role, so there is always
//    at least one admin left and nobody locks the arcade.
router.put("/users/:id/role", async (request, response) => {
  const { id } = request.params;
  const body = request.body || {};
  const role = typeof body.role === "string" ? body.role : "";

  if (!/^\d+$/.test(id)) {
    return response.status(400).json({ error: "Bad account id." });
  }
  if (role !== "player" && role !== "admin") {
    return response.status(400).json({ error: "Role must be player or admin." });
  }
  if (String(request.user.id) === id) {
    return response.status(400).json({ error: "You cannot change your own role." });
  }

  try {
    const { rows } = await pool.query(
      "UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, role",
      [role, Number(id)],
    );
    if (rows.length === 0) {
      return response.status(404).json({ error: "That account does not exist." });
    }
    response.json({ user: rows[0] });
  } catch (error) {
    console.error("Role update failed:", error.message);
    response.status(500).json({ error: "Could not update the role." });
  }
});

// The access log: who tried the admin door lately, allowed or denied.
router.get("/access-log", async (_request, response) => {
  try {
    const { rows } = await pool.query(
      "SELECT username, endpoint, allowed, created_at " +
        "FROM admin_access_log ORDER BY created_at DESC LIMIT 15",
    );
    response.json({ log: rows });
  } catch (error) {
    console.error("Access log read failed:", error.message);
    response.status(500).json({ error: "Could not load the access log." });
  }
});

module.exports = router;
