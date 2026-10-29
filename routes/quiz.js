// Phase 2: the quizzes. The SERVER grades everything - the pages
// never see a correct answer until after the quiz is submitted.
// Phase 3: every FINISHED quiz is also saved to the attempts table.

const express = require("express");
const router = express.Router();
const pool = require("../db");
const { requireAuth } = require("../middleware/auth");

// Grade one submission. rows = [{id, correct_answer}], answers = {"<id>": "A".."D"}.
// Unanswered questions count as wrong. Returns null when the
// submission itself is invalid (a foreign question id or a bad letter).
// Each mark also carries what the player picked and the correct letter,
// so the page can show a full review after the quiz is graded.
function gradeSubmission(rows, answers) {
  const ids = new Set(rows.map(function (r) { return r.id; }));
  const keys = Object.keys(answers);
  for (let i = 0; i < keys.length; i++) {
    const id = Number(keys[i]);
    const letter = answers[keys[i]];
    if (!ids.has(id)) return null;
    if (!/^[ABCD]$/.test(letter)) return null;
  }
  let score = 0;
  const marks = [];
  for (let i = 0; i < rows.length; i++) {
    const picked = answers[String(rows[i].id)] || null;
    const ok = picked === rows[i].correct_answer;
    if (ok) score++;
    marks.push({ id: rows[i].id, correct: ok, picked: picked, answer: rows[i].correct_answer });
  }
  const total = rows.length;
  return {
    score: score,
    total: total,
    percentage: Math.round((score / total) * 100),
    marks: marks,
  };
}

// List the quizzes.
router.get("/", requireAuth, async (req, res) => {
  try {
    const quizzes = await pool.query("SELECT id, name FROM quizzes ORDER BY id");
    res.json({ quizzes: quizzes.rows });
  } catch (err) {
    console.error("Quiz list failed: " + err.message);
    res.status(500).json({ error: "Something went wrong. Try again." });
  }
});

// Phase 3: the logged-in player's own history. Only their own
// attempts are ever returned - one player can never see another's.
router.get("/history", requireAuth, async (req, res) => {
  try {
    const rows = await pool.query(
      "SELECT attempts.id, quizzes.name AS quiz_name, attempts.score, attempts.question_count, attempts.completed_at FROM attempts JOIN quizzes ON quizzes.id = attempts.quiz_id WHERE attempts.user_id = $1 ORDER BY attempts.completed_at DESC, attempts.id DESC",
      [req.session.userId]
    );
    res.json({ attempts: rows.rows });
  } catch (err) {
    console.error("History failed: " + err.message);
    res.status(500).json({ error: "Something went wrong. Try again." });
  }
});

// The questions for one quiz - WITHOUT the correct answers.
router.get("/:id/questions", requireAuth, async (req, res) => {
  const quizId = Number(req.params.id);
  if (!Number.isInteger(quizId) || quizId < 1) {
    return res.status(404).json({ error: "Quiz not found." });
  }
  try {
    const quiz = await pool.query("SELECT id, name FROM quizzes WHERE id = $1", [quizId]);
    if (quiz.rows.length === 0) {
      return res.status(404).json({ error: "Quiz not found." });
    }
    const questions = await pool.query(
      "SELECT id, question_text, choice_a, choice_b, choice_c, choice_d FROM questions WHERE quiz_id = $1 ORDER BY id",
      [quizId]
    );
    if (questions.rows.length === 0) {
      return res.status(503).json({ error: "No questions loaded. Run: npm run seed-questions" });
    }
    res.json({ quiz: quiz.rows[0], questions: questions.rows });
  } catch (err) {
    console.error("Questions failed: " + err.message);
    res.status(500).json({ error: "Something went wrong. Try again." });
  }
});

// Submit answers. The SERVER does all the grading.
router.post("/:id/submit", requireAuth, async (req, res) => {
  const quizId = Number(req.params.id);
  const answers = (req.body || {}).answers || {};
  if (!Number.isInteger(quizId) || quizId < 1) {
    return res.status(404).json({ error: "Quiz not found." });
  }
  try {
    const quiz = await pool.query("SELECT id, name FROM quizzes WHERE id = $1", [quizId]);
    if (quiz.rows.length === 0) {
      return res.status(404).json({ error: "Quiz not found." });
    }
    const rows = await pool.query(
      "SELECT id, correct_answer FROM questions WHERE quiz_id = $1 ORDER BY id",
      [quizId]
    );
    if (rows.rows.length === 0) {
      return res.status(503).json({ error: "No questions loaded. Run: npm run seed-questions" });
    }
    const result = gradeSubmission(rows.rows, answers);
    if (!result) {
      return res.status(400).json({ error: "That submission has invalid answers." });
    }
    // Phase 3: save this FINISHED attempt. Only a submitted quiz gets a
    // row (unfinished never counts) and every retry is a new record.
    await pool.query(
      "INSERT INTO attempts (user_id, quiz_id, score, question_count) VALUES ($1, $2, $3, $4)",
      [req.session.userId, quizId, result.score, result.total]
    );
    res.json(result);
  } catch (err) {
    console.error("Submit failed: " + err.message);
    res.status(500).json({ error: "Something went wrong. Try again." });
  }
});

module.exports = router;
module.exports.gradeSubmission = gradeSubmission;
