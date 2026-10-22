// Server-side session and role checks. The client is never trusted for identity.
const { pool } = require("../db/index");

// Records every attempt to use an admin route (allowed or denied) so the
// real admin can see who tried the door. Logging never blocks the request.
async function logAdminAccess(request, username, allowed) {
  try {
    await pool.query(
      "INSERT INTO admin_access_log (username, endpoint, allowed) VALUES ($1, $2, $3)",
      [username, String(request.originalUrl || "").slice(0, 100), allowed],
    );
  } catch (error) {
    console.error("Access log failed:", error.message);
  }
}

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
  // Not logged in at all? Log the try, then say no.
  if (!request.session || !request.session.userId) {
    await logAdminAccess(request, null, false);
    return response.status(401).json({ error: "You must be logged in to do that." });
  }

  // Runs requireAuth first (it loads the user fresh from the database),
  // then checks the role server-side and records the attempt either way.
  await requireAuth(request, response, async () => {
    const allowed = request.user.role === "admin";
    await logAdminAccess(request, request.user.username, allowed);
    if (!allowed) {
      return response.status(403).json({ error: "Admins only." });
    }
    next();
  });
}

module.exports = { requireAuth, requireAdmin };
