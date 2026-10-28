// Server-side session and role checks. The client is never trusted for identity.
const { pool } = require("../db/index");

async function requireAuth(request, response, next) {
  try {
    if (!request.session || !request.session.userId) {
      return response.status(401).json({ error: "You must be logged in to do that." });
    }

    const { rows } = await pool.query(
      "SELECT id, username, email, role FROM users WHERE id = $1",
      [request.session.userId],
    );

    if (rows.length === 0) {
      return response.status(401).json({ error: "Session no longer valid. Please log in again." });
    }

    request.user = rows[0];
    next();
  } catch (error) {
    console.error("requireAuth failed:", error.message);
    response.status(500).json({ error: "Something went wrong. Try again." });
  }
}

async function requireAdmin(request, response, next) {
  // Runs requireAuth first (it loads the user fresh from the database),
  // then checks the role server-side.
  await requireAuth(request, response, () => {
    if (request.user.role !== "admin") {
      return response.status(403).json({ error: "Admins only." });
    }
    next();
  });
}

module.exports = { requireAuth, requireAdmin };
