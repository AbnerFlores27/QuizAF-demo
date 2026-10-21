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

// Health check endpoint
app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

// Database example endpoint
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

// Quiz API endpoints

// Initialize database schema for quiz
app.post("/api/quiz/init", async (_request, response) => {
  try {
    const client = await pool.connect();
    
    // Create questions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id SERIAL PRIMARY KEY,
        question_text TEXT NOT NULL,
        option_a TEXT NOT NULL,
        option_b TEXT NOT NULL,
        option_c TEXT NOT NULL,
        option_d TEXT NOT NULL,
        correct_answer CHAR(1) NOT NULL,
        category VARCHAR(100) DEFAULT 'General',
        difficulty VARCHAR(20) DEFAULT 'Medium',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create leaderboard table
    await client.query(`
      CREATE TABLE IF NOT EXISTS leaderboard (
        id SERIAL PRIMARY KEY,
        player_name VARCHAR(100) NOT NULL,
        score INTEGER NOT NULL,
        total_questions INTEGER NOT NULL,
        percentage DECIMAL(5,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard(score DESC, created_at DESC)
    `);

    client.release();
    
    return response.json({ 
      status: "ok", 
      message: "Database schema initialized successfully." 
    });
  } catch (error) {
    console.error("Database initialization failed:", error);
    return response.status(503).json({ 
      error: "Unable to initialize database.",
      details: error.message 
    });
  }
});

// Load sample questions
app.post("/api/quiz/sample-questions", async (_request, response) => {
  const sampleQuestions = [
    {
      question_text: "What is the capital of France?",
      option_a: "London",
      option_b: "Paris",
      option_c: "Berlin",
      option_d: "Madrid",
      correct_answer: "B",
      category: "Geography",
      difficulty: "Easy"
    },
    {
      question_text: "Which planet is known as the Red Planet?",
      option_a: "Venus",
      option_b: "Mars",
      option_c: "Jupiter",
      option_d: "Saturn",
      correct_answer: "B",
      category: "Science",
      difficulty: "Easy"
    },
    {
      question_text: "What is 2 + 2?",
      option_a: "3",
      option_b: "4",
      option_c: "5",
      option_d: "6",
      correct_answer: "B",
      category: "Math",
      difficulty: "Easy"
    },
    {
      question_text: "Who wrote 'Romeo and Juliet'?",
      option_a: "Charles Dickens",
      option_b: "William Shakespeare",
      option_c: "Jane Austen",
      option_d: "Mark Twain",
      correct_answer: "B",
      category: "Literature",
      difficulty: "Medium"
    },
    {
      question_text: "What is the largest mammal?",
      option_a: "Elephant",
      option_b: "Blue Whale",
      option_c: "Giraffe",
      option_d: "Polar Bear",
      correct_answer: "B",
      category: "Science",
      difficulty: "Medium"
    },
    {
      question_text: "Which language is used for web development?",
      option_a: "Python",
      option_b: "Java",
      option_c: "JavaScript",
      option_d: "C++",
      correct_answer: "C",
      category: "Technology",
      difficulty: "Easy"
    },
    {
      question_text: "What year did World War II end?",
      option_a: "1944",
      option_b: "1945",
      option_c: "1946",
      option_d: "1947",
      correct_answer: "B",
      category: "History",
      difficulty: "Medium"
    },
    {
      question_text: "What is the chemical symbol for gold?",
      option_a: "Go",
      option_b: "Gd",
      option_c: "Au",
      option_d: "Ag",
      correct_answer: "C",
      category: "Science",
      difficulty: "Hard"
    },
    {
      question_text: "Which country has the largest population?",
      option_a: "India",
      option_b: "United States",
      option_c: "China",
      option_d: "Indonesia",
      correct_answer: "C",
      category: "Geography",
      difficulty: "Medium"
    },
    {
      question_text: "What is the square root of 64?",
      option_a: "4",
      option_b: "6",
      option_c: "8",
      option_d: "10",
      correct_answer: "C",
      category: "Math",
      difficulty: "Easy"
    }
  ];

  try {
    const client = await pool.connect();
    
    // Clear existing questions
    await client.query("TRUNCATE TABLE questions");
    
    // Insert sample questions
    for (const question of sampleQuestions) {
      await client.query(`
        INSERT INTO questions (question_text, option_a, option_b, option_c, option_d, correct_answer, category, difficulty)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        question.question_text,
        question.option_a,
        question.option_b,
        question.option_c,
        question.option_d,
        question.correct_answer,
        question.category,
        question.difficulty
      ]);
    }
    
    client.release();
    
    return response.json({ 
      status: "ok", 
      message: `Inserted ${sampleQuestions.length} sample questions.` 
    });
  } catch (error) {
    console.error("Loading sample questions failed:", error);
    return response.status(503).json({ 
      error: "Unable to load sample questions.",
      details: error.message 
    });
  }
});

// Get all questions
app.get("/api/quiz/questions", async (_request, response) => {
  try {
    const result = await pool.query(`
      SELECT id, question_text, option_a, option_b, option_c, option_d, 
             correct_answer, category, difficulty 
      FROM questions 
      ORDER BY RANDOM()
      LIMIT 10
    `);
    
    return response.json(result.rows);
  } catch (error) {
    console.error("Fetching questions failed:", error);
    return response.status(503).json({ 
      error: "Unable to fetch questions.",
      details: error.message 
    });
  }
});

// Get questions by category
app.get("/api/quiz/questions/category/:category", async (request, response) => {
  const category = request.params.category;
  
  try {
    const result = await pool.query(`
      SELECT id, question_text, option_a, option_b, option_c, option_d, 
             correct_answer, category, difficulty 
      FROM questions 
      WHERE category = $1 
      ORDER BY RANDOM()
      LIMIT 10
    `, [category]);
    
    return response.json(result.rows);
  } catch (error) {
    console.error("Fetching questions by category failed:", error);
    return response.status(503).json({ 
      error: "Unable to fetch questions by category.",
      details: error.message 
    });
  }
});

// Get questions by difficulty
app.get("/api/quiz/questions/difficulty/:difficulty", async (request, response) => {
  const difficulty = request.params.difficulty;
  
  try {
    const result = await pool.query(`
      SELECT id, question_text, option_a, option_b, option_c, option_d, 
             correct_answer, category, difficulty 
      FROM questions 
      WHERE difficulty = $1 
      ORDER BY RANDOM()
      LIMIT 10
    `, [difficulty]);
    
    return response.json(result.rows);
  } catch (error) {
    console.error("Fetching questions by difficulty failed:", error);
    return response.status(503).json({ 
      error: "Unable to fetch questions by difficulty.",
      details: error.message 
    });
  }
});

// Get all categories
app.get("/api/quiz/categories", async (_request, response) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT category FROM questions ORDER BY category
    `);
    
    return response.json(result.rows.map(row => row.category));
  } catch (error) {
    console.error("Fetching categories failed:", error);
    return response.status(503).json({ 
      error: "Unable to fetch categories.",
      details: error.message 
    });
  }
});

// Submit score to leaderboard
app.post("/api/quiz/leaderboard", async (request, response) => {
  const { playerName, score, totalQuestions } = request.body;
  
  if (!playerName || typeof score !== 'number' || typeof totalQuestions !== 'number') {
    return response.status(400).json({ 
      error: "Missing required fields: playerName, score, totalQuestions" 
    });
  }
  
  const percentage = Math.round((score / totalQuestions) * 100 * 100) / 100;
  
  try {
    const result = await pool.query(`
      INSERT INTO leaderboard (player_name, score, total_questions, percentage)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [playerName, score, totalQuestions, percentage]);
    
    return response.json({ 
      status: "ok", 
      entry: result.rows[0]
    });
  } catch (error) {
    console.error("Submitting to leaderboard failed:", error);
    return response.status(503).json({ 
      error: "Unable to submit score to leaderboard.",
      details: error.message 
    });
  }
});

// Get leaderboard entries
app.get("/api/quiz/leaderboard", async (request, response) => {
  const limit = request.query.limit ? Math.min(Number(request.query.limit), 100) : 10;
  
  try {
    const result = await pool.query(`
      SELECT id, player_name, score, total_questions, percentage, created_at
      FROM leaderboard 
      ORDER BY percentage DESC, score DESC, created_at DESC
      LIMIT $1
    `, [limit]);
    
    return response.json(result.rows);
  } catch (error) {
    console.error("Fetching leaderboard failed:", error);
    return response.status(503).json({ 
      error: "Unable to fetch leaderboard.",
      details: error.message 
    });
  }
});

// Add a new question
app.post("/api/quiz/questions", async (request, response) => {
  const { questionText, optionA, optionB, optionC, optionD, correctAnswer, category, difficulty } = request.body;
  
  if (!questionText || !optionA || !optionB || !optionC || !optionD || !correctAnswer) {
    return response.status(400).json({ 
      error: "Missing required fields" 
    });
  }
  
  const validAnswers = ['A', 'B', 'C', 'D'];
  if (!validAnswers.includes(correctAnswer.toUpperCase())) {
    return response.status(400).json({ 
      error: "correctAnswer must be one of: A, B, C, D" 
    });
  }
  
  try {
    const result = await pool.query(`
      INSERT INTO questions (question_text, option_a, option_b, option_c, option_d, 
                           correct_answer, category, difficulty)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      questionText,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswer.toUpperCase(),
      category || 'General',
      difficulty || 'Medium'
    ]);
    
    return response.json({ 
      status: "ok", 
      question: result.rows[0]
    });
  } catch (error) {
    console.error("Adding question failed:", error);
    return response.status(503).json({ 
      error: "Unable to add question.",
      details: error.message 
    });
  }
});

// Delete a question
app.delete("/api/quiz/questions/:id", async (request, response) => {
  const id = request.params.id;
  
  try {
    const result = await pool.query(
      "DELETE FROM questions WHERE id = $1 RETURNING *",
      [id]
    );
    
    if (result.rowCount === 0) {
      return response.status(404).json({ error: "Question not found." });
    }
    
    return response.json({ 
      status: "ok", 
      message: "Question deleted successfully.",
      deleted: result.rows[0]
    });
  } catch (error) {
    console.error("Deleting question failed:", error);
    return response.status(503).json({ 
      error: "Unable to delete question.",
      details: error.message 
    });
  }
});

// Get quiz statistics
app.get("/api/quiz/stats", async (_request, response) => {
  try {
    const [questionsResult, leaderboardResult] = await Promise.all([
      pool.query("SELECT COUNT(*) as total FROM questions"),
      pool.query("SELECT COUNT(*) as total FROM leaderboard")
    ]);
    
    const questionsCount = questionsResult.rows[0].total;
    const leaderboardCount = leaderboardResult.rows[0].total;
    
    return response.json({ 
      total_questions: Number(questionsCount),
      total_scores: Number(leaderboardCount)
    });
  } catch (error) {
    console.error("Fetching stats failed:", error);
    return response.status(503).json({ 
      error: "Unable to fetch statistics.",
      details: error.message 
    });
  }
});

// Fallback for API routes
app.use("/api", (_request, response) => {
  response.status(404).json({ error: "API route not found." });
});

// Serve quiz.html at /quiz
app.get("/quiz", (_request, response) => {
  response.sendFile(path.join(__dirname, "public", "quiz.html"));
});

// Redirect root to quiz
app.get("/", (_request, response) => {
  response.redirect("/quiz");
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on 0.0.0.0:${port}`);
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});
