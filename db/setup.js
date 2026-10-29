// Creates the tables if they do not exist yet. Safe to run again.
const fs = require("fs");
const path = require("path");
const pool = require("./index");

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(sql);
  console.log("Tables ready.");
  await pool.end();
}

main().catch((err) => {
  console.error("Setup failed: " + err.message);
  process.exit(1);
});
