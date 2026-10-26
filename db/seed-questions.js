// Phase 2 seed: loads the 5 quizzes + all 50 questions from
// templates/questions.csv into the database. Idempotent: run it as
// many times as you want - it re-reads the CSV and reloads each quiz's
// questions inside ONE transaction, so a bad file can never leave
// half a quiz behind.
const fs = require("node:fs");
const path = require("node:path");
const { pool } = require("./index");
const { ensureSchema } = require("./setup");

// The 5 quiz cabinets on GAME SELECT.
const QUIZZES = [
  { id: 1, name: "GAMING HISTORY" },
  { id: 2, name: "SPORTS" },
  { id: 3, name: "TECH & INTERNET" },
  { id: 4, name: "MOVIES & TV" },
  { id: 5, name: "MUSIC" },
];

const CHOICE_LETTERS = ["A", "B", "C", "D"];

// Pure CSV reader + validator (no database), so the file format rules
// live in one testable place.
function parseQuestionsCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    throw new Error("questions.csv has no question rows.");
  }

  const expected = [
    "quiz_id",
    "question_text",
    "choice_a",
    "choice_b",
    "choice_c",
    "choice_d",
    "correct_answer",
  ];
  const header = lines[0].split(",").map((field) => field.trim());
  if (header.length !== expected.length || header.some((field, i) => field !== expected[i])) {
    throw new Error("questions.csv header must be: " + expected.join(","));
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = lines[i].split(",").map((field) => field.trim());
    const rowNumber = i + 1;

    if (fields.length !== expected.length) {
      throw new Error(
        "Row " + rowNumber + " needs exactly 7 fields (got " + fields.length + "). No commas inside the text.",
      );
    }

    const row = {
      quiz_id: Number(fields[0]),
      question_text: fields[1],
      choices: [fields[2], fields[3], fields[4], fields[5]],
      correct_answer: fields[6].toUpperCase(),
    };

    if (!QUIZZES.some((quiz) => quiz.id === row.quiz_id)) {
      throw new Error("Row " + rowNumber + ": quiz_id must be 1, 2, 3, 4, or 5.");
    }
    if (!row.question_text) {
      throw new Error("Row " + rowNumber + ": question_text is empty.");
    }
    row.choices.forEach((choice, choiceIndex) => {
      if (!choice) {
        throw new Error("Row " + rowNumber + ": choice " + CHOICE_LETTERS[choiceIndex] + " is empty.");
      }
    });
    if (!CHOICE_LETTERS.includes(row.correct_answer)) {
      throw new Error("Row " + rowNumber + ": correct_answer must be A, B, C, or D.");
    }

    rows.push(row);
  }
  return rows;
}

async function seedQuestions() {
  await ensureSchema();

  const csvPath = path.join(__dirname, "..", "templates", "questions.csv");
  const rows = parseQuestionsCsv(fs.readFileSync(csvPath, "utf8"));

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const quiz of QUIZZES) {
      await client.query(
        "INSERT INTO quizzes (id, name) VALUES ($1, $2) " +
          "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name",
        [quiz.id, quiz.name],
      );
      await client.query("DELETE FROM questions WHERE quiz_id = $1", [quiz.id]);
    }

    for (const row of rows) {
      await client.query(
        "INSERT INTO questions " +
          "(quiz_id, question_text, choice_a, choice_b, choice_c, choice_d, correct_answer) " +
          "VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [
          row.quiz_id,
          row.question_text,
          row.choices[0],
          row.choices[1],
          row.choices[2],
          row.choices[3],
          row.correct_answer,
        ],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }

  const { rows: counts } = await pool.query(
    "SELECT quiz_id, COUNT(*)::int AS count FROM questions GROUP BY quiz_id ORDER BY quiz_id",
  );
  counts.forEach((row) => {
    const quiz = QUIZZES.find((q) => q.id === row.quiz_id);
    console.log("Quiz " + row.quiz_id + " (" + quiz.name + "): " + row.count + " questions.");
  });
  console.log("Loaded " + rows.length + " questions total from templates/questions.csv.");

  await pool.end();
}

if (require.main === module) {
  seedQuestions().catch(async (error) => {
    console.error("Question seed failed:", error.message);
    await pool.end().catch(() => {});
    process.exit(1);
  });
}

module.exports = { parseQuestionsCsv, seedQuestions };
