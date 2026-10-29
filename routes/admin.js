// Admin-only API. Players get a plain 403 - the server decides.
// Phase 4: also the question editor and the CSV import (admin only).

const express = require("express");
const router = express.Router();
const pool = require("../db");
const { requireAdmin } = require("../middleware/auth");
const { parseQuestionsCsv } = require("../db/seed-questions");

// Check one question before it is saved. Returns an error message or null.
function validateQuestion(body) {
  const quizId = Number(body.quiz_id);
  const text = String(body.question_text || "").trim();
  const a = String(body.choice_a || "").trim();
  const b = String(body.choice_b || "").trim();
  const c = String(body.choice_c || "").trim();
  const d = String(body.choice_d || "").trim();
  const answer = String(body.correct_answer || "").trim().toUpperCase();
  if (!Number.isInteger(quizId) || quizId < 1 || quizId > 5) return "Pick a quiz from 1 to 5.";
  if (!text) return "The question text is empty.";
  if (text.length > 300) return "The question is too long (300 characters max).";
  if (!a || !b || !c || !d) return "Every choice needs text.";
  if (a.length > 150 || b.length > 150 || c.length > 150 || d.length > 150) {
    return "Choices must be 150 characters or less.";
  }
  if (!/^[ABCD]$/.test(answer)) return "The correct answer must be A, B, C, or D.";
  return null;
}

// The user list: usernames and roles ONLY - never emails.
router.get("/users", requireAdmin, async (req, res) => {
  try {
    const list = await pool.query(
      "SELECT username, role, created_at FROM users ORDER BY created_at"
    );
    res.json({ users: list.rows });
  } catch (err) {
    console.error("User list failed: " + err.message);
    res.status(500).json({ error: "Something went wrong. Try again." });
  }
});

// Phase 4: every question WITH its correct answer (admin only).
router.get("/questions", requireAdmin, async (req, res) => {
  try {
    const rows = await pool.query(
      "SELECT questions.id, questions.quiz_id, quizzes.name AS quiz_name, questions.question_text, questions.choice_a, questions.choice_b, questions.choice_c, questions.choice_d, questions.correct_answer FROM questions JOIN quizzes ON quizzes.id = questions.quiz_id ORDER BY questions.quiz_id, questions.id"
    );
    let questions = rows.rows;
    const quizFilter = req.query.quiz;
    if (quizFilter !== undefined && quizFilter !== "" && quizFilter !== "all") {
      const q = Number(quizFilter);
      questions = questions.filter(function (row) { return row.quiz_id === q; });
    }
    res.json({ questions: questions });
  } catch (err) {
    console.error("Question list failed: " + err.message);
    res.status(500).json({ error: "Something went wrong. Try again." });
  }
});

// Add one question.
router.post("/questions", requireAdmin, async (req, res) => {
  const problem = validateQuestion(req.body || {});
  if (problem) return res.status(400).json({ error: problem });
  try {
    const saved = await pool.query(
      "INSERT INTO questions (quiz_id, question_text, choice_a, choice_b, choice_c, choice_d, correct_answer) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
      [
        Number(req.body.quiz_id),
        String(req.body.question_text).trim(),
        String(req.body.choice_a).trim(),
        String(req.body.choice_b).trim(),
        String(req.body.choice_c).trim(),
        String(req.body.choice_d).trim(),
        String(req.body.correct_answer).trim().toUpperCase(),
      ]
    );
    res.json({ id: saved.rows[0].id });
  } catch (err) {
    console.error("Add question failed: " + err.message);
    res.status(500).json({ error: "Something went wrong. Try again." });
  }
});

// Edit one question.
router.put("/questions/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(404).json({ error: "Question not found." });
  }
  const problem = validateQuestion(req.body || {});
  if (problem) return res.status(400).json({ error: problem });
  try {
    const saved = await pool.query(
      "UPDATE questions SET quiz_id = $1, question_text = $2, choice_a = $3, choice_b = $4, choice_c = $5, choice_d = $6, correct_answer = $7 WHERE id = $8 RETURNING id",
      [
        Number(req.body.quiz_id),
        String(req.body.question_text).trim(),
        String(req.body.choice_a).trim(),
        String(req.body.choice_b).trim(),
        String(req.body.choice_c).trim(),
        String(req.body.choice_d).trim(),
        String(req.body.correct_answer).trim().toUpperCase(),
        id,
      ]
    );
    if (saved.rows.length === 0) {
      return res.status(404).json({ error: "Question not found." });
    }
    res.json({ id: saved.rows[0].id });
  } catch (err) {
    console.error("Edit question failed: " + err.message);
    res.status(500).json({ error: "Something went wrong. Try again." });
  }
});

// Preview a CSV: parse + validate it, change NOTHING.
router.post("/questions/preview", requireAdmin, async (req, res) => {
  const csv = String((req.body || {}).csv || "");
  const parsed = parseQuestionsCsv(csv);
  res.json({
    rows: parsed.rows.length,
    errors: parsed.errors,
    preview: parsed.rows.slice(0, 10),
  });
});

// Import a CSV: REPLACES all the questions. Only a clean CSV passes.
router.post("/questions/import", requireAdmin, async (req, res) => {
  const csv = String((req.body || {}).csv || "");
  const parsed = parseQuestionsCsv(csv);
  if (parsed.errors.length) {
    return res.status(400).json({
      error: "Fix these first: " + parsed.errors.slice(0, 10).join(" "),
    });
  }
  if (parsed.rows.length === 0) {
    return res.status(400).json({ error: "The CSV has no questions." });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("TRUNCATE questions RESTART IDENTITY");
    for (const r of parsed.rows) {
      await client.query(
        "INSERT INTO questions (quiz_id, question_text, choice_a, choice_b, choice_c, choice_d, correct_answer) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [r.quizId, r.question, r.a, r.b, r.c, r.d, r.answer]
      );
    }
    await client.query("COMMIT");
    res.json({ imported: parsed.rows.length });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("CSV import failed: " + err.message);
    res.status(500).json({ error: "Something went wrong. Try again." });
  } finally {
    client.release();
  }
});

module.exports = router;
module.exports.validateQuestion = validateQuestion;
