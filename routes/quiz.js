// Phase 2 API: THE QUIZ ENGINE.
// The browser NEVER sees the correct answers: GET loads the questions
// without them, and POST /submit sends the player's picks in for the
// SERVER to grade. Empty, invalid, or incomplete submissions are
// rejected or graded safely - they can never crash the server.
const express = require("express");
const { pool } = require("../db/index");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const CHOICE_LETTERS = ["A", "B", "C", "D"];

// Every quiz route needs a logged-in player.
router.use(requireAuth);

// The 5 cabinets on GAME SELECT.
router.get("/", async (request, response) => {
  try {
    const { rows } = await pool.query("SELECT id, name FROM quizzes ORDER BY id");
    response.json({ quizzes: rows });
  } catch (error) {
    console.error("Quiz list failed:", error.message);
    response.status(500).json({ error: "Could not load the quiz list." });
  }
});

// Load one quiz's questions - WITHOUT the correct answers.
router.get("/:id/questions", async (request, response) => {
  const quizId = Number(request.params.id);
  if (!Number.isInteger(quizId) || quizId < 1) {
    return response.status(400).json({ error: "Unknown quiz." });
  }

  try {
    const quizResult = await pool.query("SELECT id, name FROM quizzes WHERE id = $1", [quizId]);
    const quiz = quizResult.rows[0];
    if (!quiz) {
      return response.status(404).json({ error: "That quiz does not exist." });
    }

    const { rows } = await pool.query(
      "SELECT id, question_text, choice_a, choice_b, choice_c, choice_d " +
        "FROM questions WHERE quiz_id = $1 ORDER BY id",
      [quizId],
    );

    if (rows.length === 0) {
      return response.status(503).json({
        error: "This cabinet has no questions loaded yet. Run: npm run seed-questions",
      });
    }

    response.json({
      quiz: quiz.name,
      questions: rows.map((row) => ({
        id: row.id,
        question_text: row.question_text,
        choices: [row.choice_a, row.choice_b, row.choice_c, row.choice_d],
      })),
    });
  } catch (error) {
    console.error("Question load failed:", error.message);
    response.status(500).json({ error: "Could not load the questions." });
  }
});

// Pure grading helper: questions = [{id, correct_answer}],
// submitted = [{question_id, choice}]. Returns { error } when the
// submission is invalid, or the graded result when it is fine.
function gradeSubmission(questions, submitted) {
  if (!Array.isArray(submitted) || submitted.length === 0) {
    return { error: "No answers were submitted." };
  }

  const quizQuestionIds = new Set(questions.map((q) => q.id));
  const picks = new Map();

  for (const entry of submitted) {
    const questionId = Number(entry && entry.question_id);
    const choice =
      entry && typeof entry.choice === "string" ? entry.choice.trim().toUpperCase() : "";

    if (!Number.isInteger(questionId) || !CHOICE_LETTERS.includes(choice)) {
      return { error: "Every answer needs a question and a choice A, B, C, or D." };
    }
    if (!quizQuestionIds.has(questionId)) {
      return { error: "One of those answers does not belong to this quiz." };
    }
    // If the same question shows up twice, the last pick wins.
    picks.set(questionId, choice);
  }

  // The server does ALL the grading here - the browser's math is never
  // trusted, and a question the player never answered just counts as
  // wrong (the total is always every question in the quiz).
  let score = 0;
  const details = questions.map((question) => {
    const chosen = picks.has(question.id) ? picks.get(question.id) : null;
    const correct = chosen === question.correct_answer;
    if (correct) score += 1;
    return { question_id: question.id, chosen, correct };
  });

  const total = questions.length;
  const percentage = Math.round((score / total) * 100);
  return { score, total, percentage, details };
}

// Submit a finished quiz. The SERVER does all the grading.
router.post("/:id/submit", async (request, response) => {
  const quizId = Number(request.params.id);
  if (!Number.isInteger(quizId) || quizId < 1) {
    return response.status(400).json({ error: "Unknown quiz." });
  }

  try {
    const quizResult = await pool.query("SELECT id, name FROM quizzes WHERE id = $1", [quizId]);
    const quiz = quizResult.rows[0];
    if (!quiz) {
      return response.status(404).json({ error: "That quiz does not exist." });
    }

    const { rows: questions } = await pool.query(
      "SELECT id, correct_answer FROM questions WHERE quiz_id = $1 ORDER BY id",
      [quizId],
    );
    if (questions.length === 0) {
      return response.status(503).json({
        error: "This cabinet has no questions loaded yet. Run: npm run seed-questions",
      });
    }

    const graded = gradeSubmission(questions, (request.body || {}).answers);
    if (graded.error) {
      return response.status(400).json({ error: graded.error });
    }

    response.json({ quiz_id: quiz.id, quiz: quiz.name, score: graded.score, total: graded.total, percentage: graded.percentage, details: graded.details });
  } catch (error) {
    console.error("Quiz grading failed:", error.message);
    response.status(500).json({ error: "Could not grade the quiz. Try again." });
  }
});

module.exports = router;
