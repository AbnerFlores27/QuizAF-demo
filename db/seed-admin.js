// Creates the teacher/admin account from Replit Secrets.
// Idempotent: run it as many times as you want. It never duplicates or overwrites.
const { pool } = require("./index");
const { ensureSchema } = require("./setup");
const { hashPassword } = require("../lib/passwords");

const username = (process.env.ADMIN_USERNAME || "teacher").trim();
const password = process.env.ADMIN_PASSWORD || "";

async function seedAdmin() {
  await ensureSchema();

  if (!password) {
    console.warn("ADMIN_PASSWORD is not set (add it in Replit Secrets). Skipping admin seed.");
    await pool.end();
    return;
  }

  const { rows } = await pool.query(
    "INSERT INTO users (username, email, password_hash, role) " +
      "VALUES ($1, $2, $3, 'admin') " +
      "ON CONFLICT (username) DO NOTHING " +
      "RETURNING id, username, role",
    [username, username.toLowerCase() + "@quizaf-demo.local", hashPassword(password)],
  );

  if (rows.length === 0) {
    console.log('Admin "' + username + '" already exists - nothing to do.');
  } else {
    console.log('Admin "' + username + '" created.');
  }

  await pool.end();
}

seedAdmin().catch(async (error) => {
  console.error("Seed failed:", error.message);
  await pool.end().catch(() => {});
  process.exit(1);
});
