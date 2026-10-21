// Quiz Application State
const QuizState = {
  IDLE: 'idle',
  LOADING: 'loading',
  QUIZ: 'quiz',
  RESULTS: 'results',
  LEADERBOARD: 'leaderboard',
  SETUP: 'setup'
};

// DOM Elements - Check which page we're on
const isHomePage = document.querySelector('#stats-section') !== null;
const isLoginPage = document.querySelector('#login-form') !== null;
const isQuizPage = document.querySelector('#quiz-section') !== null;

// Home Page Elements
const startQuizBtn = document.querySelector('#start-quiz-btn');
const guestQuizBtn = document.querySelector('#guest-quiz-btn');
const statsSection = document.querySelector('#stats-section');
const statsGrid = document.querySelector('#stats-grid');
const totalQuestionsStat = document.querySelector('#total-questions-stat');
const totalScoresStat = document.querySelector('#total-scores-stat');
const avgScoreStat = document.querySelector('#avg-score-stat');
const leaderboardPreview = document.querySelector('#leaderboard-preview');

// Login Page Elements
const loginForm = document.querySelector('#login-form');
const registerForm = document.querySelector('#register-form');
const loginSection = document.querySelector('#login-section');
const registerSection = document.querySelector('#register-section');
const loginBtn = document.querySelector('#login-btn');
const loginText = document.querySelector('#login-text');
const loginSpinner = document.querySelector('#login-spinner');
const loginError = document.querySelector('#login-error');
const registerBtn = document.querySelector('#register-btn');
const registerText = document.querySelector('#register-text');
const registerSpinner = document.querySelector('#register-spinner');
const registerError = document.querySelector('#register-error');
const guestBtn = document.querySelector('#guest-btn');
const registerLink = document.querySelector('#register-link');
const loginLink = document.querySelector('#login-link');

// Quiz Page Elements
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
let currentUser = null;

// Initialize the application
async function init() {
  checkApi();
  
  // Route based on page
  if (isHomePage) {
    loadHomePage();
  } else if (isLoginPage) {
    setupLoginPage();
  } else if (isQuizPage) {
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
  // Home page events
  if (startQuizBtn) {
    startQuizBtn.addEventListener('click', () => window.location.href = '/login');
  }
  
  if (guestQuizBtn) {
    guestQuizBtn.addEventListener('click', () => window.location.href = '/quiz');
  }
  
  // Login page events
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }
  
  if (registerLink) {
    registerLink.addEventListener('click', (e) => {
      e.preventDefault();
      showRegister();
    });
  }
  
  if (loginLink) {
    loginLink.addEventListener('click', (e) => {
      e.preventDefault();
      showLogin();
    });
  }
  
  if (guestBtn) {
    guestBtn.addEventListener('click', () => {
      // Store guest session
      sessionStorage.setItem('user', JSON.stringify({ username: 'Guest', isGuest: true }));
      window.location.href = '/quiz';
    });
  }
  
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

// Load home page data
async function loadHomePage() {
  try {
    // Load stats
    const statsResponse = await fetch("/api/quiz/stats");
    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      if (totalQuestionsStat) totalQuestionsStat.textContent = stats.total_questions || 0;
      if (totalScoresStat) totalScoresStat.textContent = stats.total_scores || 0;
      
      // Calculate average score
      if (stats.total_scores > 0) {
        const leaderboardResponse = await fetch("/api/quiz/leaderboard?limit=100");
        if (leaderboardResponse.ok) {
          const entries = await leaderboardResponse.json();
          if (entries.length > 0) {
            const avgPercentage = entries.reduce((sum, entry) => sum + entry.percentage, 0) / entries.length;
            if (avgScoreStat) avgScoreStat.textContent = `${Math.round(avgPercentage)}%`;
          }
        }
      }
      if (statsSection) statsSection.style.display = 'block';
    }
    
    // Load leaderboard preview
    const leaderboardResponse = await fetch("/api/quiz/leaderboard?limit=5");
    if (leaderboardResponse.ok) {
      const entries = await leaderboardResponse.json();
      if (leaderboardPreview) {
        if (entries.length === 0) {
          leaderboardPreview.innerHTML = '<div class="empty-state">No scores yet. Be the first!</div>';
        } else {
          leaderboardPreview.innerHTML = `
            <div class="leaderboard-table-header" style="display: grid; grid-template-columns: 40px 1fr 80px; gap: 12px; padding: 12px 14px; font-size: 0.85rem; font-weight: 700; color: #5c6b83; background: #f8f9fa; border-radius: 8px 8px 0 0;">
              <span style="text-align: center;">Rank</span>
              <span>Name</span>
              <span style="text-align: center;">Score</span>
            </div>
            <div style="display: grid; grid-template-columns: 40px 1fr 80px; gap: 12px; background: #f8f9fa; border-radius: 0 0 8px 8px; overflow: hidden;">
              ${entries.map((entry, index) => `
                <span style="padding: 12px 14px; text-align: center; font-weight: 700; color: #315ed5;">${index + 1}</span>
                <span style="padding: 12px 14px; font-weight: 500;">${entry.player_name}</span>
                <span style="padding: 12px 14px; text-align: center; font-weight: 700; color: #14724b;">${entry.score}/${entry.total_questions}</span>
              `).join('')}
            </div>
          `;
        }
      }
    }
  } catch (error) {
    console.error("Error loading home page:", error);
  }
}

// Setup login page
function setupLoginPage() {
  // Check if already logged in
  const user = sessionStorage.getItem('user');
  if (user) {
    window.location.href = '/quiz';
  }
}

// Handle login
async function handleLogin(event) {
  event.preventDefault();
  
  const username = document.querySelector('#username').value.trim();
  const password = document.querySelector('#password').value;
  
  if (!username || !password) {
    showLoginError('Please enter both username and password.');
    return;
  }
  
  // Show loading state
  loginText.style.display = 'none';
  loginSpinner.style.display = 'inline-block';
  loginBtn.disabled = true;
  
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Login failed.');
    }
    
    // Store user in session
    sessionStorage.setItem('user', JSON.stringify({
      username: data.user.username,
      email: data.user.email,
      isGuest: false
    }));
    
    // Redirect to quiz
    window.location.href = '/quiz';
    
  } catch (error) {
    showLoginError(error.message);
    loginText.style.display = 'inline';
    loginSpinner.style.display = 'none';
    loginBtn.disabled = false;
  }
}

// Handle registration
async function handleRegister(event) {
  event.preventDefault();
  
  const username = document.querySelector('#reg-username').value.trim();
  const email = document.querySelector('#reg-email').value.trim();
  const password = document.querySelector('#reg-password').value;
  const confirmPassword = document.querySelector('#reg-confirm').value;
  
  if (!username || !email || !password || !confirmPassword) {
    showRegisterError('Please fill in all fields.');
    return;
  }
  
  if (password !== confirmPassword) {
    showRegisterError('Passwords do not match.');
    return;
  }
  
  if (password.length < 8) {
    showRegisterError('Password must be at least 8 characters.');
    return;
  }
  
  // Show loading state
  registerText.style.display = 'none';
  registerSpinner.style.display = 'inline-block';
  registerBtn.disabled = true;
  
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, email, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Registration failed.');
    }
    
    // Store user in session
    sessionStorage.setItem('user', JSON.stringify({
      username: data.user.username,
      email: data.user.email,
      isGuest: false
    }));
    
    // Redirect to quiz
    window.location.href = '/quiz';
    
  } catch (error) {
    showRegisterError(error.message);
    registerText.style.display = 'inline';
    registerSpinner.style.display = 'none';
    registerBtn.disabled = false;
  }
}

// Show login form
function showLogin() {
  if (registerSection) registerSection.style.display = 'none';
  if (loginSection) loginSection.style.display = 'block';
  if (loginError) loginError.style.display = 'none';
}

// Show register form
function showRegister() {
  if (loginSection) loginSection.style.display = 'none';
  if (registerSection) registerSection.style.display = 'block';
  if (registerError) registerError.style.display = 'none';
}

// Show login error
function showLoginError(message) {
  if (loginError) {
    loginError.textContent = message;
    loginError.style.display = 'block';
  }
}

// Show register error
function showRegisterError(message) {
  if (registerError) {
    registerError.textContent = message;
    registerError.style.display = 'block';
  }
}

// Load quiz questions
async function loadQuiz() {
  state = QuizState.LOADING;
  showLoadingState();
  
  // Check if user is logged in
  const user = sessionStorage.getItem('user');
  if (user) {
    currentUser = JSON.parse(user);
  }
  
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
  if (questionNumberEl) questionNumberEl.textContent = currentQuestionIndex + 1;
  if (totalQuestionsEl) totalQuestionsEl.textContent = questions.length;
  
  // Update question text
  if (questionTextEl) questionTextEl.textContent = question.question_text;
  
  // Clear previous options
  if (optionsContainerEl) optionsContainerEl.innerHTML = '';
  
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
    
    if (optionsContainerEl) optionsContainerEl.appendChild(optionEl);
  });
  
  // Clear feedback
  if (feedbackEl) {
    feedbackEl.textContent = '';
    feedbackEl.className = 'feedback';
  }
}

// Check if answer is correct
function checkAnswer(selected, correct) {
  if (feedbackEl) {
    if (selected === correct) {
      showFeedback('Correct!', 'correct');
    } else {
      showFeedback('Incorrect. Try again!', 'incorrect');
    }
  }
}

// Show feedback message
function showFeedback(message, type = 'info') {
  if (feedbackEl) {
    feedbackEl.textContent = message;
    feedbackEl.className = `feedback ${type}`;
  }
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
  if (prevBtn) prevBtn.disabled = currentQuestionIndex === 0;
  
  // Next button
  const hasAnswered = userAnswers[currentQuestionIndex] !== null;
  
  // Show submit button on last question
  if (currentQuestionIndex === questions.length - 1) {
    if (nextBtn) nextBtn.style.display = 'none';
    if (submitBtn) submitBtn.style.display = 'block';
    if (submitBtn) submitBtn.disabled = !hasAnswered;
  } else {
    if (nextBtn) nextBtn.style.display = 'block';
    if (submitBtn) submitBtn.style.display = 'none';
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
  if (quizSection) quizSection.style.display = 'none';
  if (resultsSection) resultsSection.style.display = 'block';
  
  // Update score display
  if (scoreDisplayEl) scoreDisplayEl.textContent = score;
  if (totalDisplayEl) totalDisplayEl.textContent = questions.length;
  
  const percentage = Math.round((score / questions.length) * 100 * 100) / 100;
  if (percentageDisplayEl) percentageDisplayEl.textContent = `${percentage}%`;
  
  // Show details
  if (resultsDetailsEl) resultsDetailsEl.innerHTML = '';
  
  questions.forEach((question, index) => {
    if (!resultsDetailsEl) return;
    
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
  if (resultsSection) resultsSection.style.display = 'none';
  if (quizSection) quizSection.style.display = 'block';
  state = QuizState.QUIZ;
  
  // Reload questions
  loadQuiz();
}

// Show leaderboard
async function showLeaderboard(fromResults = true) {
  if (fromResults) {
    if (resultsSection) resultsSection.style.display = 'none';
  } else {
    if (quizSection) quizSection.style.display = 'none';
  }
  
  if (leaderboardSection) leaderboardSection.style.display = 'block';
  state = QuizState.LEADERBOARD;
  
  // Clear previous entries
  if (leaderboardEntriesEl) leaderboardEntriesEl.innerHTML = '';
  
  // Load leaderboard data
  try {
    const response = await fetch("/api/quiz/leaderboard?limit=20");
    
    if (!response.ok) {
      throw new Error("Failed to load leaderboard.");
    }
    
    const entries = await response.json();
    
    if (entries.length === 0) {
      if (leaderboardEntriesEl) leaderboardEntriesEl.innerHTML = '<div class="empty-state">No scores yet. Be the first!</div>';
      return;
    }
    
    // Populate leaderboard
    entries.forEach((entry, index) => {
      if (!leaderboardEntriesEl) return;
      
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
      if (playerNameInput) {
        playerNameInput.value = currentUser && !currentUser.isGuest ? currentUser.username : '';
        playerNameInput.focus();
      }
    }
    
  } catch (error) {
    console.error("Error loading leaderboard:", error);
    if (leaderboardEntriesEl) leaderboardEntriesEl.innerHTML = '<div class="empty-state">Error loading leaderboard.</div>';
  }
}

// Save score to leaderboard
async function saveScore(event) {
  event.preventDefault();
  
  let playerName = '';
  if (playerNameInput) {
    playerName = playerNameInput.value.trim();
  }
  
  // Use logged in user if available
  if (currentUser && !currentUser.isGuest) {
    playerName = currentUser.username;
  }
  
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
  if (quizSection) quizSection.style.display = 'none';
  if (setupSection) setupSection.style.display = 'block';
  state = QuizState.SETUP;
  
  if (setupResultEl) setupResultEl.textContent = 'No questions found. Initialize the database and load sample questions.';
}

// Initialize database
async function initializeDatabase() {
  if (initDbBtn) initDbBtn.disabled = true;
  if (setupResultEl) setupResultEl.textContent = 'Initializing database...';
  
  try {
    // Initialize all tables
    await fetch("/api/auth/init", { method: 'POST' });
    const response = await fetch("/api/quiz/init", {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error("Failed to initialize database.");
    }
    
    const result = await response.json();
    if (setupResultEl) setupResultEl.textContent = result.message || 'Database initialized successfully!';
    
  } catch (error) {
    console.error("Error initializing database:", error);
    if (setupResultEl) setupResultEl.textContent = `Error: ${error.message}`;
  } finally {
    if (initDbBtn) initDbBtn.disabled = false;
  }
}

// Load sample questions
async function loadSampleQuestions() {
  if (loadSampleBtn) loadSampleBtn.disabled = true;
  if (setupResultEl) setupResultEl.textContent = 'Loading sample questions...';
  
  try {
    const response = await fetch("/api/quiz/sample-questions", {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error("Failed to load sample questions.");
    }
    
    const result = await response.json();
    if (setupResultEl) setupResultEl.textContent = result.message || 'Sample questions loaded successfully!';
    
    // Reload quiz after loading questions
    setTimeout(() => {
      if (setupSection) setupSection.style.display = 'none';
      if (quizSection) quizSection.style.display = 'block';
      loadQuiz();
    }, 1000);
    
  } catch (error) {
    console.error("Error loading sample questions:", error);
    if (setupResultEl) setupResultEl.textContent = `Error: ${error.message}`;
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
