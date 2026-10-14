// Applies schema.sql. Safe to run any number of times (CREATE TABLE IF NOT EXISTS).
const fs = require("node:fs");
const path = require("node:path");
const { pool } = require("./index");

const schemaPath = path.join(__dirname, "schema.sql");

async function ensureSchema() {
  const schema = fs.readFileSync(schemaPath, "utf8");
  await pool.query(schema);
}

if (require.main === module) {
  ensureSchema()
    .then(async () => {
      console.log("Schema is up to date (users + session tables).");
      await pool.end();
    })
    .catch(async (error) => {
      console.error("Could not apply schema:", error.message);
      await pool.end().catch(() => {});
      process.exit(1);
    });
}

module.exports = { ensureSchema };
