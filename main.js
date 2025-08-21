// Global variables to store quiz data
let quizData = null;
let score = 0;
let userAnswers = []; // To store user's selected answers and correctness
let liveCheckEnabled = false; // Flag for live check mode
let currentQuestionIndex = 0; // Tracks the currently displayed question

// Define the list of available JSON quiz files.
// You MUST have these files in the same directory as this index.html file for it to work.
const predefinedQuizzes = {
    "gensci.json": {
        title: "General Science Reviewer",
        questions: [{
            "question": "Which of the following is the largest planet in our solar system?",
            "options": ["Mars", "Jupiter", "Earth", "Saturn"],
            "answer": "Jupiter"
        }, {
            "question": "What is the chemical symbol for gold?",
            "options": ["Au", "Ag", "Fe", "Cu"],
            "answer": "Au"
        }, {
            "question": "The process by which plants make their own food is called?",
            "options": ["Respiration", "Transpiration", "Photosynthesis", "Germination"],
            "answer": "Photosynthesis"
        }]
    },
    "finite_math.json": {
        title: "Finite Mathematics Reviewer",
        questions: [{
            "question": "What is the result of multiplying a $3 \\times 2$ matrix by a $2 \\times 4$ matrix?",
            "options": ["A $3 \\times 4$ matrix", "A $2 \\times 2$ matrix", "A $4 \\times 3$ matrix", "This is not possible"],
            "answer": "A $3 \\times 4$ matrix"
        }, {
            "question": "If $A = \\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}$ and $B = \\begin{pmatrix} 5 \\\\ 6 \\end{pmatrix}$, what is $AB$?",
            "options": ["$\\begin{pmatrix} 17 \\\\ 39 \\end{pmatrix}$", "$AB = \\begin{pmatrix} 13 \\\\ 19 \\end{pmatrix}$", "$\\begin{pmatrix} 17 & 39 \\end{pmatrix}$", "This is not possible"],
            "answer": "$\\begin{pmatrix} 17 \\\\ 39 \\end{pmatrix}$"
        }, {
            "question": "What is the determinant of the matrix $\\begin{pmatrix} 4 & 2 \\\\ 1 & 5 \\end{pmatrix}$?",
            "options": ["18", "22", "15", "10"],
            "answer": "18"
        }]
    }
};

// DOM Elements
const quizSelectionSection = document.getElementById('quiz-selection-section');
const quizSection = document.getElementById('quiz-section');
const resultsSection = document.getElementById('results-section');
const quizDropdown = document.getElementById('quiz-dropdown');
const loadQuizButton = document.getElementById('load-quiz-button');
const quizTitleElement = document.getElementById('quiz-title');
const questionCounter = document.getElementById('question-counter');
const questionsSlideContainer = document.getElementById('questions-slide-container');
const prevQuestionButton = document.getElementById('prev-question');
const nextQuestionButton = document.getElementById('next-question');
const submitQuizButton = document.getElementById('submit-quiz');
const scoreDisplay = document.getElementById('score-display');
const feedbackMessage = document.getElementById('feedback-message');
const feedbackContainer = document.getElementById('feedback-container');
const retakeQuizButton = document.getElementById('retake-quiz');
const errorMessageElement = document.getElementById('error-message');
const shuffleQuestionsCheckbox = document.getElementById('shuffleQuestions');
const shuffleOptionsCheckbox = document.getElementById('shuffleOptions');
const enableLiveCheckCheckbox = document.getElementById('enableLiveCheck');

// Event Listeners
document.addEventListener('DOMContentLoaded', initializeQuiz);
loadQuizButton.addEventListener('click', loadQuiz);
nextQuestionButton.addEventListener('click', () => changeQuestion(1));
prevQuestionButton.addEventListener('click', () => changeQuestion(-1));
submitQuizButton.addEventListener('click', submitQuiz);
retakeQuizButton.addEventListener('click', retakeQuiz);

/**
 * Initializes the quiz by populating the dropdown with predefined quizzes.
 */
function initializeQuiz() {
    for (const file in predefinedQuizzes) {
        const option = document.createElement('option');
        option.value = file;
        option.textContent = predefinedQuizzes[file].title;
        quizDropdown.appendChild(option);
    }
    // Update button states
    updateNavigationButtons();
}

/**
 * Loads the selected quiz from the predefined JSON data.
 */
function loadQuiz() {
    const selectedFile = quizDropdown.value;
    if (!selectedFile) {
        showError("Please select a quiz to load.");
        return;
    }

    hideError();
    quizData = predefinedQuizzes[selectedFile];

    // Reset quiz state
    currentQuestionIndex = 0;
    score = 0;
    userAnswers = [];
    questionsSlideContainer.innerHTML = '';

    // Apply shuffling if enabled
    if (shuffleQuestionsCheckbox.checked) {
        quizData.questions = shuffleArray([...quizData.questions]);
    }

    // Check for live check mode
    liveCheckEnabled = enableLiveCheckCheckbox.checked;

    displayQuiz();
}

/**
 * Shuffles an array using the Fisher-Yates algorithm.
 * @param {Array} array The array to shuffle.
 * @returns {Array} The shuffled array.
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Displays the loaded quiz content and the first question.
 */
function displayQuiz() {
    quizSelectionSection.classList.add('hidden');
    quizSection.classList.remove('hidden');
    quizTitleElement.textContent = quizData.title;

    quizData.questions.forEach((question, index) => {
        const isFillInTheBlank = question.type === 'fill_in_the_blank';
        let card;
        if (isFillInTheBlank) {
            card = createFillInTheBlankCard(question, index);
        } else {
            card = createMultipleChoiceCard(question, index);
        }
        questionsSlideContainer.appendChild(card);
    });

    displayQuestion();
}

/**
 * Creates a multiple-choice question card element.
 * @param {Object} question The question data.
 * @param {number} index The index of the question.
 * @returns {HTMLElement} The created question card.
 */
function createMultipleChoiceCard(question, index) {
    const card = document.createElement('div');
    card.id = `question-card-${index}`;
    card.className = `question-card ${index === 0 ? 'active' : ''}`;
    card.innerHTML = `
        <p class="text-lg font-medium text-gray-800 mb-4 question-text">${formatMath(question.question)}</p>
        <div class="options-container">
            ${createOptionsHtml(question.options, index, question.answer)}
        </div>
    `;
    return card;
}

/**
 * Creates a fill-in-the-blank question card element.
 * @param {Object} question The question data.
 * @param {number} index The index of the question.
 * @returns {HTMLElement} The created question card.
 */
function createFillInTheBlankCard(question, index) {
    const card = document.createElement('div');
    card.id = `question-card-${index}`;
    card.className = `fill-in-the-blank-card ${index === 0 ? 'active' : ''}`;
    card.innerHTML = `
        <p class="text-lg font-medium text-gray-800 mb-4 question-text">${formatMath(question.question)}</p>
        <div class="flex flex-col items-center">
            <input type="text" id="answer-input-${index}" class="px-4 py-2 border rounded-lg w-full max-w-sm mb-4 text-center" placeholder="Enter your answer...">
            <button class="reveal-answer-button">Reveal Answer</button>
            <p class="revealed-answer mt-4 text-green-600 font-semibold hidden">Correct Answer: <span>${formatMath(question.answer)}</span></p>
        </div>
    `;

    // Event listener for reveal button
    card.querySelector('.reveal-answer-button').addEventListener('click', () => {
        const revealedAnswer = card.querySelector('.revealed-answer');
        revealedAnswer.classList.remove('hidden');
        revealedAnswer.classList.add('show');
    });

    return card;
}

/**
 * Creates the HTML for the options of a multiple-choice question.
 * @param {Array} options The list of options.
 * @param {number} questionIndex The index of the question.
 * @param {string} answer The correct answer for live check.
 * @returns {string} The HTML string for the options.
 */
function createOptionsHtml(options, questionIndex, answer) {
    let optionsToDisplay = [...options];
    if (shuffleOptionsCheckbox.checked) {
        optionsToDisplay = shuffleArray(optionsToDisplay);
    }
    return optionsToDisplay.map((option, optionIndex) => `
        <label class="option-label">
            <input type="radio" name="question-${questionIndex}" value="${option}" data-question-index="${questionIndex}" data-option-index="${optionIndex}" class="form-radio" />
            <span class="ml-3 text-gray-700">${formatMath(option)}</span>
        </label>
    `).join('');
}

/**
 * Displays the current question and updates the navigation and counter.
 */
function displayQuestion() {
    const allQuestions = questionsSlideContainer.querySelectorAll('.question-card, .fill-in-the-blank-card');
    allQuestions.forEach((card, index) => {
        card.classList.toggle('active', index === currentQuestionIndex);
        card.classList.toggle('hidden', index !== currentQuestionIndex);
    });

    questionCounter.textContent = `Question ${currentQuestionIndex + 1} of ${quizData.questions.length}`;
    updateNavigationButtons();
    MathJax.typesetPromise();
    // Add event listeners to newly displayed options for live checking
    setupLiveCheckListeners();
}

/**
 * Sets up live check event listeners for the options of the current question.
 */
function setupLiveCheckListeners() {
    if (liveCheckEnabled) {
        const currentQuestionCard = questionsSlideContainer.querySelector(`.question-card.active`);
        if (currentQuestionCard) {
            const options = currentQuestionCard.querySelectorAll('input[type="radio"]');
            options.forEach(option => {
                option.addEventListener('change', handleLiveCheck);
            });
        }
    }
}

/**
 * Handles the live check functionality when an option is selected.
 * @param {Event} event The change event.
 */
function handleLiveCheck(event) {
    const selectedOption = event.target;
    const questionIndex = parseInt(selectedOption.dataset.questionIndex, 10);
    const selectedAnswer = selectedOption.value;
    const correctAnswer = quizData.questions[questionIndex].answer;

    // Reset previous live check feedback
    const optionsContainer = selectedOption.closest('.options-container');
    optionsContainer.querySelectorAll('.option-label').forEach(label => {
        label.classList.remove('correct-live', 'incorrect-live');
    });

    // Apply new feedback
    const label = selectedOption.closest('.option-label');
    if (selectedAnswer === correctAnswer) {
        label.classList.add('correct-live');
    } else {
        label.classList.add('incorrect-live');
    }
}

/**
 * Changes the current question displayed.
 * @param {number} direction The direction to move (1 for next, -1 for back).
 */
function changeQuestion(direction) {
    const newIndex = currentQuestionIndex + direction;
    if (newIndex >= 0 && newIndex < quizData.questions.length) {
        // Save the user's answer before moving
        saveAnswer();
        currentQuestionIndex = newIndex;
        displayQuestion();
    }
}

/**
 * Saves the user's answer for the current question.
 */
function saveAnswer() {
    const question = quizData.questions[currentQuestionIndex];
    const isFillInTheBlank = question.type === 'fill_in_the_blank';
    let userAnswer = '';
    let isCorrect = false;

    if (isFillInTheBlank) {
        const inputElement = document.getElementById(`answer-input-${currentQuestionIndex}`);
        userAnswer = inputElement ? inputElement.value.trim() : '';
        isCorrect = userAnswer.toLowerCase() === question.answer.toLowerCase();
    } else {
        const selectedOption = document.querySelector(`input[name="question-${currentQuestionIndex}"]:checked`);
        userAnswer = selectedOption ? selectedOption.value : '';
        isCorrect = selectedOption ? selectedOption.value === question.answer : false;
    }

    // Check if an answer for this question already exists and update it
    const existingAnswerIndex = userAnswers.findIndex(ans => ans.questionIndex === currentQuestionIndex);
    if (existingAnswerIndex > -1) {
        userAnswers[existingAnswerIndex] = {
            questionIndex: currentQuestionIndex,
            userAnswer,
            isCorrect,
        };
    } else {
        userAnswers.push({
            questionIndex: currentQuestionIndex,
            userAnswer,
            isCorrect,
        });
    }
}

/**
 * Updates the state of the navigation buttons.
 */
function updateNavigationButtons() {
    prevQuestionButton.disabled = currentQuestionIndex === 0;
    nextQuestionButton.disabled = currentQuestionIndex === quizData.questions.length - 1;
    submitQuizButton.classList.toggle('hidden', currentQuestionIndex !== quizData.questions.length - 1);
    nextQuestionButton.classList.toggle('hidden', currentQuestionIndex === quizData.questions.length - 1);
}

/**
 * Submits the quiz, calculates the score, and displays the results.
 */
function submitQuiz() {
    saveAnswer(); // Save the last question's answer
    score = userAnswers.filter(answer => answer.isCorrect).length;

    quizSection.classList.add('hidden');
    resultsSection.classList.remove('hidden');

    scoreDisplay.textContent = `You scored ${score} out of ${quizData.questions.length}!`;

    if (score / quizData.questions.length >= 0.7) {
        feedbackMessage.textContent = 'Congratulations! You passed!';
        feedbackMessage.className = 'result-message pass';
    } else {
        feedbackMessage.textContent = 'Keep practicing! You can do better!';
        feedbackMessage.className = 'result-message fail';
    }
    feedbackMessage.classList.remove('hidden');

    displayAnswerBreakdown();
}

/**
 * Displays a breakdown of the user's answers.
 */
function displayAnswerBreakdown() {
    feedbackContainer.innerHTML = ''; // Clear previous feedback

    quizData.questions.forEach((question, index) => {
        const userAnswer = userAnswers.find(ans => ans.questionIndex === index);
        const isCorrect = userAnswer ? userAnswer.isCorrect : false;

        const feedbackItem = document.createElement('div');
        feedbackItem.className = `answer-feedback-item ${isCorrect ? 'correct' : 'incorrect'}`;
        feedbackItem.innerHTML = `
            <p class="question-text">${index + 1}. ${formatMath(question.question)}</p>
            <p class="your-answer">Your Answer: ${userAnswer ? formatMath(userAnswer.userAnswer) : 'No answer'}</p>
            <p class="correct-answer">Correct Answer: ${formatMath(question.answer)}</p>
        `;
        feedbackContainer.appendChild(feedbackItem);
    });
}

/**
 * Resets the quiz to the selection state.
 */
function retakeQuiz() {
    quizData = null; // Clear quiz data
    score = 0; // Reset score
    userAnswers = []; // Reset answers
    liveCheckEnabled = false; // Reset live check flag
    currentQuestionIndex = 0; // Reset question index
    questionsSlideContainer.innerHTML = ''; // Clear questions
    quizTitleElement.textContent = ''; // Clear title
    questionCounter.textContent = ''; // Clear counter
    feedbackContainer.innerHTML = ''; // Clear feedback container
    quizDropdown.value = ""; // Reset dropdown selection

    // Reset checkbox states
    shuffleQuestionsCheckbox.checked = false;
    shuffleOptionsCheckbox.checked = false;
    enableLiveCheckCheckbox.checked = false;

    // Disable navigation buttons
    prevQuestionButton.disabled = true;
    nextQuestionButton.disabled = true;

    resultsSection.classList.add('hidden');
    quizSection.classList.add('hidden');
    quizSelectionSection.classList.remove('hidden');
    hideError();
}

/**
 * Displays an error message.
 * @param {string} message - The error message to display.
 */
function showError(message) {
    errorMessageElement.textContent = message;
    errorMessageElement.classList.remove('hidden');
}

/**
 * Hides the error message.
 */
function hideError() {
    errorMessageElement.classList.add('hidden');
    errorMessageElement.textContent = '';
}

/**
 * Formats a string with LaTeX math for MathJax.
 * @param {string} text - The text to format.
 * @returns {string} The formatted HTML string.
 */
function formatMath(text) {
    // Replace $$ with [math] and $ with [inline-math] to prevent early MathJax rendering
    return text.replace(/\$\$(.*?)\$\$/g, '<span class="display-math-container">$$$1$$</span>')
               .replace(/\$(.*?)\$/g, '<span class="inline-math-container">$$1$$</span>');
}

// Add event listener to handle MathJax updates when content changes
document.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.querySelector('.question-text, .option-label')) {
                        MathJax.typesetPromise([node]).catch((err) => console.error(err));
                    }
                });
            }
        });
    });

    observer.observe(questionsSlideContainer, { childList: true, subtree: true });
});
