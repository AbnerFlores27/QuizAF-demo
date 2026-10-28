// One shared pool of database connections for the whole app.
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = pool;
