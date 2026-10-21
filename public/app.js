// Quiz Application State
const QuizState = {
  IDLE: 'idle',
  LOADING: 'loading',
  QUIZ: 'quiz',
  RESULTS: 'results',
  LEADERBOARD: 'leaderboard',
  SETUP: 'setup'
};

// DOM Elements
const apiStatus = document.querySelector("#api-status");
const quizSection = document.querySelector("#quiz-section");
const resultsSection = document.querySelector("#results-section");
const leaderboardSection = document.querySelector("#leaderboard-section");
const setupSection = document.querySelector("#setup-section");

// Quiz Elements
const questionNumberEl = document.querySelector("#question-number");
const totalQuestionsEl = document.querySelector("#total-questions");
const questionTextEl = document.querySelector("#question-text");
const optionsContainerEl = document.querySelector("#options-container");
const prevBtn = document.querySelector("#prev-btn");
const nextBtn = document.querySelector("#next-btn");
const submitBtn = document.querySelector("#submit-btn");
const feedbackEl = document.querySelector("#feedback");

// Results Elements
const scoreDisplayEl = document.querySelector("#score-display");
const totalDisplayEl = document.querySelector("#total-display");
const percentageDisplayEl = document.querySelector("#percentage-display");
const resultsDetailsEl = document.querySelector("#results-details");
const restartBtn = document.querySelector("#restart-btn");
const viewLeaderboardBtn = document.querySelector("#view-leaderboard-btn");

// Leaderboard Elements
const leaderboardForm = document.querySelector("#leaderboard-form");
const playerNameInput = document.querySelector("#player-name");
const leaderboardContainerEl = document.querySelector("#leaderboard-container");
const leaderboardEntriesEl = document.querySelector("#leaderboard-entries");
const backToQuizBtn = document.querySelector("#back-to-quiz-btn");

// Setup Elements
const initDbBtn = document.querySelector("#init-db-btn");
const loadSampleBtn = document.querySelector("#load-sample-btn");
const setupResultEl = document.querySelector("#setup-result");

// Application State
let state = QuizState.IDLE;
let questions = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let score = 0;
let playerName = '';

// Initialize the application
async function init() {
  checkApi();
  
  // Check if we're on the quiz page
  if (quizSection) {
    loadQuiz();
  }
  
  // Setup event listeners
  setupEventListeners();
}

// Check API health
async function checkApi() {
  try {
    const response = await fetch("/api/health");
    if (!response.ok) {
      throw new Error("The API returned an error.");
    }

    if (apiStatus) {
      apiStatus.textContent = "Online";
      apiStatus.dataset.state = "ok";
    }
  } catch {
    if (apiStatus) {
      apiStatus.textContent = "Unavailable";
      apiStatus.dataset.state = "error";
    }
  }
}

// Setup all event listeners
function setupEventListeners() {
  // Quiz navigation
  if (prevBtn) {
    prevBtn.addEventListener('click', () => navigateQuestion(-1));
  }
  
  if (nextBtn) {
    nextBtn.addEventListener('click', () => navigateQuestion(1));
  }
  
  if (submitBtn) {
    submitBtn.addEventListener('click', submitQuiz);
  }
  
  // Results actions
  if (restartBtn) {
    restartBtn.addEventListener('click', restartQuiz);
  }
  
  if (viewLeaderboardBtn) {
    viewLeaderboardBtn.addEventListener('click', () => showLeaderboard(false));
  }
  
  // Leaderboard actions
  if (leaderboardForm) {
    leaderboardForm.addEventListener('submit', saveScore);
  }
  
  if (backToQuizBtn) {
    backToQuizBtn.addEventListener('click', () => {
      leaderboardSection.style.display = 'none';
      quizSection.style.display = 'block';
      state = QuizState.QUIZ;
    });
  }
  
  // Setup actions
  if (initDbBtn) {
    initDbBtn.addEventListener('click', initializeDatabase);
  }
  
  if (loadSampleBtn) {
    loadSampleBtn.addEventListener('click', loadSampleQuestions);
  }
}

// Load quiz questions
async function loadQuiz() {
  state = QuizState.LOADING;
  showLoadingState();
  
  try {
    const response = await fetch("/api/quiz/questions");
    
    if (!response.ok) {
      throw new Error("Failed to load questions.");
    }
    
    questions = await response.json();
    
    if (questions.length === 0) {
      // No questions available, show setup
      showSetup();
      return;
    }
    
    // Reset quiz state
    currentQuestionIndex = 0;
    userAnswers = Array(questions.length).fill(null);
    score = 0;
    
    // Show first question
    showQuestion();
    state = QuizState.QUIZ;
    
    // Update button visibility
    updateButtonVisibility();
    
  } catch (error) {
    console.error("Error loading quiz:", error);
    showFeedback(`Error loading quiz: ${error.message}`, 'error');
    state = QuizState.IDLE;
  }
}

// Show a question
function showQuestion() {
  const question = questions[currentQuestionIndex];
  
  if (!question) return;
  
  // Update question number
  questionNumberEl.textContent = currentQuestionIndex + 1;
  totalQuestionsEl.textContent = questions.length;
  
  // Update question text
  questionTextEl.textContent = question.question_text;
  
  // Clear previous options
  optionsContainerEl.innerHTML = '';
  
  // Create option elements
  const options = [
    { label: 'A', text: question.option_a },
    { label: 'B', text: question.option_b },
    { label: 'C', text: question.option_c },
    { label: 'D', text: question.option_d }
  ];
  
  options.forEach(option => {
    const optionEl = document.createElement('div');
    optionEl.className = 'option';
    
    // Check if this option was selected
    if (userAnswers[currentQuestionIndex] === option.label) {
      optionEl.classList.add('selected');
    }
    
    // Check if showing results
    if (state === QuizState.RESULTS) {
      const isCorrect = question.correct_answer === option.label;
      const wasSelected = userAnswers[currentQuestionIndex] === option.label;
      
      if (wasSelected && isCorrect) {
        optionEl.classList.add('correct');
      } else if (wasSelected && !isCorrect) {
        optionEl.classList.add('incorrect');
      } else if (isCorrect) {
        optionEl.classList.add('correct');
      }
      
      optionEl.style.pointerEvents = 'none';
    }
    
    optionEl.innerHTML = `
      <input type="radio" id="option-${option.label}" name="answer" 
             value="${option.label}" ${userAnswers[currentQuestionIndex] === option.label ? 'checked' : ''}>
      <label for="option-${option.label}">${option.label}. ${option.text}</label>
    `;
    
    optionEl.addEventListener('click', () => {
      if (state !== QuizState.QUIZ) return;
      
      // Toggle selection
      userAnswers[currentQuestionIndex] = option.label;
      
      // Update UI
      document.querySelectorAll('.option').forEach(el => {
        el.classList.remove('selected');
      });
      optionEl.classList.add('selected');
      
      // Check answer
      checkAnswer(option.label, question.correct_answer);
      
      // Update button visibility
      updateButtonVisibility();
    });
    
    optionsContainerEl.appendChild(optionEl);
  });
  
  // Clear feedback
  feedbackEl.textContent = '';
  feedbackEl.className = 'feedback';
}

// Check if answer is correct
function checkAnswer(selected, correct) {
  if (selected === correct) {
    showFeedback('Correct!', 'correct');
  } else {
    showFeedback('Incorrect. Try again!', 'incorrect');
  }
}

// Show feedback message
function showFeedback(message, type = 'info') {
  feedbackEl.textContent = message;
  feedbackEl.className = `feedback ${type}`;
}

// Navigate between questions
function navigateQuestion(direction) {
  if (state !== QuizState.QUIZ) return;
  
  const newIndex = currentQuestionIndex + direction;
  
  if (newIndex >= 0 && newIndex < questions.length) {
    currentQuestionIndex = newIndex;
    showQuestion();
    updateButtonVisibility();
  }
}

// Update button visibility based on current state
function updateButtonVisibility() {
  if (state !== QuizState.QUIZ) return;
  
  // Previous button
  prevBtn.disabled = currentQuestionIndex === 0;
  
  // Next button
  const hasAnswered = userAnswers[currentQuestionIndex] !== null;
  
  // Show submit button on last question
  if (currentQuestionIndex === questions.length - 1) {
    nextBtn.style.display = 'none';
    submitBtn.style.display = 'block';
    submitBtn.disabled = !hasAnswered;
  } else {
    nextBtn.style.display = 'block';
    submitBtn.style.display = 'none';
  }
}

// Submit quiz
function submitQuiz() {
  if (state !== QuizState.QUIZ) return;
  
  // Calculate score
  let correctCount = 0;
  
  questions.forEach((question, index) => {
    if (userAnswers[index] === question.correct_answer) {
      correctCount++;
    }
  });
  
  score = correctCount;
  
  // Show results
  showResults();
  state = QuizState.RESULTS;
}

// Show results
function showResults() {
  quizSection.style.display = 'none';
  resultsSection.style.display = 'block';
  
  // Update score display
  scoreDisplayEl.textContent = score;
  totalDisplayEl.textContent = questions.length;
  
  const percentage = Math.round((score / questions.length) * 100 * 100) / 100;
  percentageDisplayEl.textContent = `${percentage}%`;
  
  // Show details
  resultsDetailsEl.innerHTML = '';
  
  questions.forEach((question, index) => {
    const resultItem = document.createElement('div');
    resultItem.className = `result-item ${
      userAnswers[index] === question.correct_answer ? 'correct' : 'incorrect'
    }`;
    
    const isCorrect = userAnswers[index] === question.correct_answer;
    const userAnswer = userAnswers[index] || 'Not answered';
    
    resultItem.innerHTML = `
      <span class="icon ${isCorrect ? 'correct' : 'incorrect'}">
        ${isCorrect ? '✓' : '✗'}
      </span>
      <span class="question">${question.question_text}</span>
      <span class="answer">Your answer: ${getOptionText(question, userAnswer)}</span>
    `;
    
    resultsDetailsEl.appendChild(resultItem);
  });
}

// Get option text from label
function getOptionText(question, label) {
  switch (label) {
    case 'A': return question.option_a;
    case 'B': return question.option_b;
    case 'C': return question.option_c;
    case 'D': return question.option_d;
    default: return label;
  }
}

// Restart quiz
function restartQuiz() {
  resultsSection.style.display = 'none';
  quizSection.style.display = 'block';
  state = QuizState.QUIZ;
  
  // Reload questions
  loadQuiz();
}

// Show leaderboard
async function showLeaderboard(fromResults = true) {
  if (fromResults) {
    resultsSection.style.display = 'none';
  } else {
    quizSection.style.display = 'none';
  }
  
  leaderboardSection.style.display = 'block';
  state = QuizState.LEADERBOARD;
  
  // Clear previous entries
  leaderboardEntriesEl.innerHTML = '';
  
  // Load leaderboard data
  try {
    const response = await fetch("/api/quiz/leaderboard?limit=20");
    
    if (!response.ok) {
      throw new Error("Failed to load leaderboard.");
    }
    
    const entries = await response.json();
    
    if (entries.length === 0) {
      leaderboardEntriesEl.innerHTML = '<div class="empty-state">No scores yet. Be the first!</div>';
      return;
    }
    
    // Populate leaderboard
    entries.forEach((entry, index) => {
      const entryEl = document.createElement('div');
      entryEl.className = 'leaderboard-entry';
      
      const date = new Date(entry.created_at).toLocaleDateString();
      
      entryEl.innerHTML = `
        <span class="rank-col">${index + 1}</span>
        <span class="name-col">${entry.player_name}</span>
        <span class="score-col">${entry.score}/${entry.total_questions}</span>
        <span class="date-col">${date}</span>
      `;
      
      leaderboardEntriesEl.appendChild(entryEl);
    });
    
    // If coming from results, pre-fill the name and show form
    if (fromResults) {
      playerNameInput.value = '';
      playerNameInput.focus();
    }
    
  } catch (error) {
    console.error("Error loading leaderboard:", error);
    leaderboardEntriesEl.innerHTML = '<div class="empty-state">Error loading leaderboard.</div>';
  }
}

// Save score to leaderboard
async function saveScore(event) {
  event.preventDefault();
  
  const playerName = playerNameInput.value.trim();
  
  if (!playerName) {
    showFeedback('Please enter your name.', 'error');
    return;
  }
  
  try {
    const response = await fetch("/api/quiz/leaderboard", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        playerName,
        score,
        totalQuestions: questions.length
      })
    });
    
    if (!response.ok) {
      throw new Error("Failed to save score.");
    }
    
    // Show success message
    showFeedback('Score saved successfully!', 'correct');
    
    // Reload leaderboard
    setTimeout(() => {
      showLeaderboard(false);
    }, 1000);
    
  } catch (error) {
    console.error("Error saving score:", error);
    showFeedback(`Error saving score: ${error.message}`, 'error');
  }
}

// Show setup section
function showSetup() {
  quizSection.style.display = 'none';
  setupSection.style.display = 'block';
  state = QuizState.SETUP;
  
  setupResultEl.textContent = 'No questions found. Initialize the database and load sample questions.';
}

// Initialize database
async function initializeDatabase() {
  if (initDbBtn) initDbBtn.disabled = true;
  setupResultEl.textContent = 'Initializing database...';
  
  try {
    const response = await fetch("/api/quiz/init", {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error("Failed to initialize database.");
    }
    
    const result = await response.json();
    setupResultEl.textContent = result.message || 'Database initialized successfully!';
    
  } catch (error) {
    console.error("Error initializing database:", error);
    setupResultEl.textContent = `Error: ${error.message}`;
  } finally {
    if (initDbBtn) initDbBtn.disabled = false;
  }
}

// Load sample questions
async function loadSampleQuestions() {
  if (loadSampleBtn) loadSampleBtn.disabled = true;
  setupResultEl.textContent = 'Loading sample questions...';
  
  try {
    const response = await fetch("/api/quiz/sample-questions", {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error("Failed to load sample questions.");
    }
    
    const result = await response.json();
    setupResultEl.textContent = result.message || 'Sample questions loaded successfully!';
    
    // Reload quiz after loading questions
    setTimeout(() => {
      setupSection.style.display = 'none';
      quizSection.style.display = 'block';
      loadQuiz();
    }, 1000);
    
  } catch (error) {
    console.error("Error loading sample questions:", error);
    setupResultEl.textContent = `Error: ${error.message}`;
  } finally {
    if (loadSampleBtn) loadSampleBtn.disabled = false;
  }
}

// Show loading state
function showLoadingState() {
  if (quizSection) {
    quizSection.classList.add('loading');
  }
}

// Hide loading state
function hideLoadingState() {
  if (quizSection) {
    quizSection.classList.remove('loading');
  }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', init);
