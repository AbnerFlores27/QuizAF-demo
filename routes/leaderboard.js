// Phase 4: the leaderboards. Usernames only - never emails.
// Overall board = how many quizzes each player FINISHED (ties share
// the same rank). Per-quiz board = best score, then fewer tries,
// then earlier date, then A-Z.

// Build the per-quiz board from flat attempt rows.
// Rows must come sorted by completed_at ASC so "tries" adds up in order.
function buildQuizBoard(rows) {
  var byUser = {};
  rows.forEach(function (r) {
    var u = byUser[r.user_id];
    if (!u) {
      u = byUser[r.user_id] = {
        username: r.username,
        best_score: r.score,
        question_count: r.question_count,
        tries: 0,
        achieved_at: r.completed_at,
      };
    }
    u.tries += 1;
    if (r.score > u.best_score) {
      u.best_score = r.score;
      u.achieved_at = r.completed_at;
    } else if (r.score === u.best_score && r.completed_at < u.achieved_at) {
      u.achieved_at = r.completed_at;
    }
  });
  var board = Object.keys(byUser).map(function (k) { return byUser[k]; });
  board.sort(function (x, y) {
    if (y.best_score !== x.best_score) return y.best_score - x.best_score;
    if (x.tries !== y.tries) return x.tries - y.tries;
    if (x.achieved_at !== y.achieved_at) return x.achieved_at < y.achieved_at ? -1 : 1;
    return x.username.localeCompare(y.username);
  });
  return board;
}

// Sort + rank the overall rows. Players with the same total share a rank.
function rankOverallRows(rows) {
  var sorted = rows.slice().sort(function (x, y) {
    if (y.finished !== x.finished) return y.finished - x.finished;
    return x.username.localeCompare(y.username);
  });
  var rank = 0;
  for (var i = 0; i < sorted.length; i++) {
    if (i === 0 || sorted[i].finished !== sorted[i - 1].finished) {
      rank = i + 1;
    }
    sorted[i].rank = rank;
  }
  return sorted;
}

const express = require("express");
const router = express.Router();
const pool = require("../db");
const { requireAuth } = require("../middleware/auth");

// Overall: total FINISHED quizzes per player.
router.get("/overall", requireAuth, async (req, res) => {
  try {
    const rows = await pool.query(
      "SELECT users.username, COUNT(*)::int AS finished FROM attempts JOIN users ON users.id = attempts.user_id GROUP BY users.id, users.username"
    );
    res.json({
      board: rankOverallRows(rows.rows),
      rule: "Rank = how many quizzes each player FINISHED. Ties share the same rank.",
    });
  } catch (err) {
    console.error("Overall leaderboard failed: " + err.message);
    res.status(500).json({ error: "Something went wrong. Try again." });
  }
});

// Per quiz: best score, then fewer tries, then earlier date, then A-Z.
router.get("/quiz/:id", requireAuth, async (req, res) => {
  const quizId = Number(req.params.id);
  if (!Number.isInteger(quizId) || quizId < 1) {
    return res.status(404).json({ error: "Quiz not found." });
  }
  try {
    const quiz = await pool.query("SELECT id, name FROM quizzes WHERE id = $1", [quizId]);
    if (quiz.rows.length === 0) {
      return res.status(404).json({ error: "Quiz not found." });
    }
    const rows = await pool.query(
      "SELECT attempts.user_id, users.username, attempts.score, attempts.question_count, attempts.completed_at FROM attempts JOIN users ON users.id = attempts.user_id WHERE attempts.quiz_id = $1 ORDER BY attempts.completed_at ASC, attempts.id ASC",
      [quizId]
    );
    res.json({
      quiz: quiz.rows[0],
      board: buildQuizBoard(rows.rows),
      rule: "Best score first. Ties: fewer tries, then earlier date, then A-Z.",
    });
  } catch (err) {
    console.error("Quiz leaderboard failed: " + err.message);
    res.status(500).json({ error: "Something went wrong. Try again." });
  }
});

module.exports = router;
module.exports.buildQuizBoard = buildQuizBoard;
module.exports.rankOverallRows = rankOverallRows;
