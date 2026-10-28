// Wipes the Phase 1 tables and recreates them empty - a clean slate
// for testing "the FIRST registered account becomes the admin".
// Console-only on purpose: this is a shell tool, never a web route.
const fs = require("fs");
const path = require("path");
const pool = require("./index");

async function main() {
  await pool.query('DROP TABLE IF EXISTS "session"');
  await pool.query("DROP TABLE IF EXISTS users");
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(sql);
  console.log("Clean slate. Register the first account - it becomes the admin.");
  await pool.end();
}

main().catch((err) => {
  console.error("Reset failed: " + err.message);
  process.exit(1);
});
