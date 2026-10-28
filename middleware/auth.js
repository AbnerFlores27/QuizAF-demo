// Guards for API routes. The SERVER decides who gets in.

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Please log in first." });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Please log in first." });
  }
  if (req.session.role !== "admin") {
    return res.status(403).json({ error: "Admins only." });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
