const express = require("express");
const path = require("node:path");
const { Pool } = require("pg");

const app = express();
const port = Number(process.env.PORT || 5000);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.get("/api/db/example", async (request, response) => {
  const text = typeof request.query.text === "string" ? request.query.text.trim() : "";

  if (!text) {
    return response.status(400).json({ error: "Provide a non-empty text query parameter." });
  }

  if (text.length > 200) {
    return response.status(400).json({ error: "Text must be 200 characters or fewer." });
  }

  try {
    const result = await pool.query(
      "SELECT $1::text AS message, CURRENT_TIMESTAMP AS queried_at",
      [text],
    );

    return response.json(result.rows[0]);
  } catch (error) {
    console.error("PostgreSQL query failed:", error);
    return response.status(503).json({ error: "Unable to query PostgreSQL right now." });
  }
});

app.use("/api", (_request, response) => {
  response.status(404).json({ error: "API route not found." });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on 0.0.0.0:${port}`);
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});
