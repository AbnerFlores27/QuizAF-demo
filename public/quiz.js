// Phase 2: THE QUIZ ENGINE - the 5 cabinets finally open for real.
// Clicking a cabinet on GAME SELECT loads its questions onto the
// machine screen, one at a time. The questions arrive WITHOUT their
// correct answers; when the quiz is done, the browser sends the
// player's picks to the server and the SERVER does all the grading.
// (arcade.js provides window.arcadeShow + playTone/coinDing/denyBuzz.)

(function () {
  const LETTERS = ["A", "B", "C", "D"];

  let quiz = null;        // { id, name, questions: [{ id, question_text, choices }] }
  let picks = new Map();  // question id -> the letter the player picked
  let index = 0;          // which question is on the screen right now
  let loading = false;

  function show(name) {
    if (typeof window.arcadeShow === "function") window.arcadeShow(name);
  }

  function byId(id) {
    return document.getElementById(id);
  }

  async function startQuiz(quizId) {
    if (loading) return;
    if (!Number.isInteger(quizId) || quizId < 1 || quizId > 5) {
      byId("cabinet-message").textContent = "PICK ONE OF THE 5 CABINETS.";
      return;
    }

    loading = true;
    byId("cabinet-message").textContent = "LOADING...";

    try {
      const response = await fetch("/api/quizzes/" + quizId + "/questions");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load the quiz.");

      quiz = { id: quizId, name: data.quiz, questions: data.questions };
      picks = new Map();
      index = 0;
      byId("cabinet-message").textContent = "";
      renderQuestion();
      show("quiz");
    } catch (error) {
      if (typeof denyBuzz === "function") denyBuzz();
      byId("cabinet-message").textContent =
        (error.message || "Could not load the quiz.").toUpperCase();
    } finally {
      loading = false;
    }
  }

  // Show the question the player is on. The player can go BACK and
  // change an earlier answer; the saved pick lights up again.
  function renderQuestion() {
    const question = quiz.questions[index];
    const total = quiz.questions.length;

    byId("quiz-title").textContent = quiz.name;
    byId("quiz-progress").textContent = "QUESTION " + (index + 1) + " OF " + total;
    byId("quiz-question").textContent = question.question_text;
    byId("quiz-message").textContent = "";

    const prev = byId("quiz-prev");
    const next = byId("quiz-next");
    prev.disabled = index === 0;
    next.disabled = false;
    next.textContent = index === total - 1 ? "SUBMIT" : "NEXT";

    const holder = byId("quiz-choices");
    holder.innerHTML = "";

    question.choices.forEach((choice, choiceIndex) => {
      const letter = LETTERS[choiceIndex];
      const option = document.createElement("button");
      option.type = "button";
      option.className = "quiz-choice" + (picks.get(question.id) === letter ? " picked" : "");

      const glyph = document.createElement("span");
      glyph.className = "choice-letter";
      glyph.textContent = letter;

      const text = document.createElement("span");
      text.className = "choice-text";
      text.textContent = choice;

      option.append(glyph, text);

      option.addEventListener("click", () => {
        picks.set(question.id, letter);
        holder.querySelectorAll(".quiz-choice").forEach((button) => button.classList.remove("picked"));
        option.classList.add("picked");
        byId("quiz-message").textContent = "";
        playTone(392 + choiceIndex * 70, 0.05);
      });

      holder.append(option);
    });
  }

  function goTo(nextIndex) {
    if (nextIndex < 0) return;
    if (nextIndex >= quiz.questions.length) {
      submitQuiz();
      return;
    }
    index = nextIndex;
    renderQuestion();
  }

  async function submitQuiz() {
    const next = byId("quiz-next");
    next.disabled = true;
    byId("quiz-prev").disabled = true;
    byId("quiz-message").textContent = "GRADING...";

    // Only answered questions go in - the server counts anything missing
    // as wrong, so the score can never say 10/10 with holes in it.
    const answers = quiz.questions
      .filter((question) => picks.has(question.id))
      .map((question) => ({ question_id: question.id, choice: picks.get(question.id) }));

    try {
      const response = await fetch("/api/quizzes/" + quiz.id + "/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not grade the quiz.");

      renderResults(data);
    } catch (error) {
      if (typeof denyBuzz === "function") denyBuzz();
      byId("quiz-message").textContent =
        (error.message || "Could not grade the quiz.").toUpperCase();
      next.disabled = false;
      byId("quiz-prev").disabled = false;
    }
  }

  function renderResults(data) {
    byId("results-title").textContent = data.percentage === 100 ? "HIGH SCORE!" : "GAME OVER";
    byId("results-score").textContent = "SCORE: " + data.score + "/" + data.total;
    byId("results-percent").textContent = data.percentage + "%";

    const marks = byId("results-marks");
    marks.innerHTML = "";
    data.details.forEach((detail) => {
      const mark = document.createElement("span");
      mark.className = "result-mark " + (detail.correct ? "mark-correct" : "mark-wrong");
      mark.textContent = detail.correct ? "\u25CF" : "\u2715";
      marks.append(mark);
    });

    let line = "TOUGH CABINET - RETRY WHEN READY.";
    if (data.percentage === 100) line = "PERFECT RUN!";
    else if (data.percentage >= 70) line = "GREAT GAME!";
    else if (data.percentage >= 40) line = "NICE TRY!";
    byId("results-message").textContent = line;

    if (data.percentage === 100 && typeof coinDing === "function") coinDing();
    else playTone(784, 0.09);

    show("results");
  }

  document.addEventListener("DOMContentLoaded", () => {
    byId("quiz-prev").addEventListener("click", () => {
      playTone(330, 0.05);
      if (quiz) goTo(index - 1);
    });

    byId("quiz-next").addEventListener("click", () => {
      if (!quiz) return;
      const question = quiz.questions[index];
      if (!picks.has(question.id)) {
        if (typeof denyBuzz === "function") denyBuzz();
        byId("quiz-message").textContent = "PICK AN ANSWER FIRST!";
        return;
      }
      playTone(659, 0.06);
      goTo(index + 1);
    });

    byId("quiz-retry").addEventListener("click", () => {
      playTone(523, 0.07);
      startQuiz(quiz.id);
    });

    byId("quiz-back").addEventListener("click", () => {
      playTone(392, 0.06);
      quiz = null;
      picks = new Map();
      document.querySelectorAll(".cabinet-item").forEach((button) => button.classList.remove("selected"));
      byId("cabinet-message").textContent = "CREDIT: 1 - GAME SELECT";
      show("in");
    });
  });

  // arcade.js calls this when a cabinet is clicked on GAME SELECT.
  window.startQuiz = startQuiz;
})();
