// Seeds the admin accounts. Idempotent: run it as many times as you want.
// It never duplicates accounts and never overwrites a password.
const { pool } = require("./index");
const { ensureSchema } = require("./setup");
const { hashPassword } = require("../lib/passwords");

// Abner's own account is THE main admin.
const MAIN_ADMIN_USERNAME = "ABNER";
const MAIN_ADMIN_EMAIL = "399546@guhsd.net";

// Backup admin (from Replit Secrets, "teacher" by default).
const backupUsername = (process.env.ADMIN_USERNAME || "teacher").trim();
const password = process.env.ADMIN_PASSWORD || "";

async function seedAdmin() {
  await ensureSchema();

  if (!password) {
    console.warn("ADMIN_PASSWORD is not set (add it in Replit Secrets). Skipping admin seed.");
    await pool.end();
    return;
  }

  // 1) Main admin: ABNER.
  //    - If his account already exists (he registered with his own password),
  //      just make sure the role is admin. The password is never touched.
  //    - If it does not exist yet, create it with the ADMIN_PASSWORD secret
  //      so he can log in right away.
  const existing = await pool.query(
    "SELECT id, username FROM users WHERE LOWER(username) = LOWER($1) OR email = $2",
    [MAIN_ADMIN_USERNAME, MAIN_ADMIN_EMAIL],
  );

  if (existing.rows.length > 0) {
    for (const row of existing.rows) {
      await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [row.id]);
    }
    console.log(
      'Main admin ready: "' + existing.rows.map((r) => r.username).join('", "') + '" is now an admin.',
    );
  } else {
    await pool.query(
      "INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, 'admin')",
      [MAIN_ADMIN_USERNAME, MAIN_ADMIN_EMAIL, hashPassword(password)],
    );
    console.log('Main admin created: "ABNER" - log in with the ADMIN_PASSWORD secret.');
  }

  // 2) Backup admin (same as before).
  const { rows } = await pool.query(
    "INSERT INTO users (username, email, password_hash, role) " +
      "VALUES ($1, $2, $3, 'admin') " +
      "ON CONFLICT (username) DO NOTHING " +
      "RETURNING id, username, role",
    [backupUsername, backupUsername.toLowerCase() + "@quizaf-demo.local", hashPassword(password)],
  );

  if (rows.length === 0) {
    console.log('Backup admin "' + backupUsername + '" already exists - nothing to do.');
  } else {
    console.log('Backup admin "' + backupUsername + '" created.');
  }

  await pool.end();
}

seedAdmin().catch(async (error) => {
  console.error("Seed failed:", error.message);
  await pool.end().catch(() => {});
  process.exit(1);
});
