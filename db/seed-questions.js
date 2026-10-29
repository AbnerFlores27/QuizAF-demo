// Phase 2: loads the 50 California sports questions (all about California teams) from templates/questions.csv
// into the quizzes + questions tables. Safe to run again at any time.

const fs = require("fs");
const path = require("path");
const pool = require("./index");

const QUIZ_NAMES = {
  1: "Basketball",
  2: "Football",
  3: "Soccer",
  4: "Baseball",
  5: "Hockey",
};

// Parse + validate the CSV. Returns { rows, errors }.
function parseQuestionsCsv(text) {
  const rows = [];
  const errors = [];
  const lines = text.trim().split(/\r?\n/);
  for (let i = 1; i < lines.length; i++) { // skip the header row
    const lineNumber = i + 1;
    if (!lines[i].trim()) continue;
    const fields = lines[i].split(",");
    if (fields.length !== 7) {
      errors.push("Line " + lineNumber + ": needs 7 fields, has " + fields.length + ".");
      continue;
    }
    const cells = fields.map(function (c) { return c.trim(); });
    const rowErrors = [];
    const quizId = Number(cells[0]);
    const answer = cells[6].toUpperCase();
    if (!QUIZ_NAMES[quizId]) rowErrors.push("quiz_id " + cells[0] + " must be 1-5");
    if (!cells[1] || !cells[2] || !cells[3] || !cells[4] || !cells[5]) rowErrors.push("a field is empty");
    if (!["A", "B", "C", "D"].includes(answer)) rowErrors.push("correct answer must be A, B, C, or D");
    if (rowErrors.length) {
      errors.push("Line " + lineNumber + ": " + rowErrors.join("; ") + ".");
      continue;
    }
    rows.push({ quizId: quizId, question: cells[1], a: cells[2], b: cells[3], c: cells[4], d: cells[5], answer: answer });
  }
  // Every quiz needs exactly 10 questions.
  for (const id of Object.keys(QUIZ_NAMES)) {
    const n = rows.filter(function (r) { return r.quizId === Number(id); }).length;
    if (n !== 10) errors.push("Quiz " + id + " (" + QUIZ_NAMES[id] + ") has " + n + " questions, needs 10.");
  }
  return { rows: rows, errors: errors };
}

// Load everything into the database inside one transaction.
async function loadQuestions(poolArg) {
  const csvPath = path.join(__dirname, "..", "templates", "questions.csv");
  const text = fs.readFileSync(csvPath, "utf8");
  const parsed = parseQuestionsCsv(text);
  if (parsed.errors.length) {
    throw new Error("questions.csv has problems:\n" + parsed.errors.join("\n"));
  }
  const client = await poolArg.connect();
  try {
    await client.query("BEGIN");
    // Stable ids: questions always get ids 1-50 in the same CSV order.
    // Before this fix, the id counter kept growing on every server
    // restart, so a quiz page left open from before a restart sent the
    // server OLD ids and the server called the submission invalid.
    // RESTART IDENTITY resets the counter back to 1 every time.
    await client.query("TRUNCATE questions RESTART IDENTITY");
    for (const id of Object.keys(QUIZ_NAMES)) {
      await client.query(
        "INSERT INTO quizzes (id, name) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name",
        [Number(id), QUIZ_NAMES[id]]
      );
      const quizRows = parsed.rows.filter(function (r) { return r.quizId === Number(id); });
      for (const r of quizRows) {
        await client.query(
          "INSERT INTO questions (quiz_id, question_text, choice_a, choice_b, choice_c, choice_d, correct_answer) VALUES ($1, $2, $3, $4, $5, $6, $7)",
          [r.quizId, r.question, r.a, r.b, r.c, r.d, r.answer]
        );
      }
    }
    await client.query("COMMIT");
    return parsed.rows.length;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function main() {
  const n = await loadQuestions(pool);
  console.log("Loaded " + n + " questions into " + Object.keys(QUIZ_NAMES).length + " quizzes.");
  await pool.end();
}

if (require.main === module) {
  main().catch(function (err) {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { parseQuestionsCsv: parseQuestionsCsv, loadQuestions: loadQuestions };
