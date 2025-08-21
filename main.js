let quizData = null;
let score = 0;
let userAnswers = [];
let liveCheckEnabled = false;
let currentQuestionIndex = 0;

const availableQuizzes = ['gensci.json', 'finite_math.json'];

const quizDropdown = document.getElementById('quiz-dropdown');
const loadQuizButton = document.getElementById('load-quiz-button');
const quizSelectionSection = document.getElementById('quiz-selection-section');
const quizSection = document.getElementById('quiz-section');
const quizTitleElement = document.getElementById('quiz-title');
const questionCounter = document.getElementById('question-counter');
const questionsSlideContainer = document.getElementById('questions-slide-container');
const submitQuizButton = document.getElementById('submit-quiz');
const resultsSection = document.getElementById('results-section');
const scoreDisplay = document.getElementById('score-display');
const feedbackMessage = document.getElementById('feedback-message');
const retakeQuizButton = document.getElementById('retake-quiz');
const errorMessageElement = document.getElementById('error-message');
const feedbackContainer = document.getElementById('feedback-container');
const shuffleQuestionsCheckbox = document.getElementById('shuffleQuestions');
const shuffleOptionsCheckbox = document.getElementById('shuffleOptions');
const enableLiveCheckCheckbox = document.getElementById('enableLiveCheck');
const prevQuestionButton = document.getElementById('prev-question');
const nextQuestionButton = document.getElementById('next-question');

loadQuizButton.addEventListener('click', loadQuizFromDropdown);
submitQuizButton.addEventListener('click', submitQuiz);
retakeQuizButton.addEventListener('click', resetQuiz);
prevQuestionButton.addEventListener('click', () => showQuestion(currentQuestionIndex - 1));
nextQuestionButton.addEventListener('click', () => showQuestion(currentQuestionIndex + 1));
document.addEventListener('DOMContentLoaded', populateQuizDropdown);

/**
 * Populates the quiz dropdown with available quiz file names.
 */
function populateQuizDropdown() {
    availableQuizzes.forEach(quizFileName => {
        const option = document.createElement('option');
        option.value = quizFileName;
        option.textContent = quizFileName.replace('.json', '');
        quizDropdown.appendChild(option);
    });
}

/**
 * Loads the selected quiz from a JSON file.
 */
async function loadQuizFromDropdown() {
    const selectedQuizFile = quizDropdown.value;
    if (!selectedQuizFile) {
        showError("Please select a quiz from the list.");
        return;
    }
    try {
        const response = await fetch(selectedQuizFile);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const shouldShuffleQuestions = shuffleQuestionsCheckbox.checked;
        const shouldShuffleOptions = shuffleOptionsCheckbox.checked;
        liveCheckEnabled = enableLiveCheckCheckbox.checked;
        validateQuizData(data);
        quizData = JSON.parse(JSON.stringify(data));
        if (shouldShuffleQuestions) {
            shuffleArray(quizData.questions);
        }
        if (shouldShuffleOptions) {
            quizData.questions.forEach(q => {
                if (q.type === 'multiple_choice' && q.options) {
                    shuffleArray(q.options);
                }
            });
        }
        startQuiz();
    } catch (e) {
        console.error('Failed to load quiz:', e);
        showError(`Failed to load quiz: ${e.message}`);
    }
}

/**
 * Shuffles an array in place using the Fisher-Yates algorithm.
 * @param {Array} array - The array to shuffle.
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 * Starts the quiz by hiding the selection screen and displaying the first question.
 */
function startQuiz() {
    userAnswers = new Array(quizData.questions.length).fill(null);
    score = 0;
    currentQuestionIndex = 0;
    // Add transition to hide the selection screen
    quizSelectionSection.classList.add('fade-out');
    quizSelectionSection.addEventListener('animationend', () => {
        quizSelectionSection.classList.add('hidden');
        quizSection.classList.remove('hidden');
        quizSection.classList.add('fade-in');
    }, { once: true });

    resultsSection.classList.add('hidden');
    questionsSlideContainer.innerHTML = '';
    errorMessageElement.classList.add('hidden');
    feedbackContainer.innerHTML = '';
    quizTitleElement.textContent = quizData.title;
    submitQuizButton.classList.remove('hidden');

    quizData.questions.forEach((q, index) => {
        let questionCard;
        if (q.type === 'multiple_choice') {
            questionCard = document.createElement('div');
            questionCard.className = 'question-card';
            questionCard.setAttribute('data-question-index', index);
            questionCard.setAttribute('data-question-type', q.type);
            const questionText = document.createElement('p');
            questionText.className = 'text-lg font-medium text-gray-900 mb-4';
            questionText.innerHTML = `${index + 1}. ${applyBoldFormatting(q.question)}`;
            questionCard.appendChild(questionText);
            const optionsList = document.createElement('div');
            optionsList.className = 'flex flex-col gap-2';
            q.options.forEach((option) => {
                const optionLabel = document.createElement('label');
                optionLabel.className = 'option-label';
                const radioInput = document.createElement('input');
                radioInput.type = 'radio';
                radioInput.name = `question-${index}`;
                radioInput.value = option;
                radioInput.className = 'form-radio h-5 w-5 text-indigo-600 transition duration-150 ease-in-out';
                radioInput.setAttribute('data-question-index', index);
                radioInput.setAttribute('data-option-value', option);
                if (liveCheckEnabled) {
                    radioInput.addEventListener('change', handleLiveAnswer);
                }
                const optionSpan = document.createElement('span');
                optionSpan.className = 'ml-3 text-base text-gray-700';
                optionSpan.innerHTML = applyBoldFormatting(option);
                optionLabel.appendChild(radioInput);
                optionLabel.appendChild(optionSpan);
                optionsList.appendChild(optionLabel);
            });
            questionCard.appendChild(optionsList);
        } else if (q.type === 'fill_in_the_blank') {
            questionCard = document.createElement('div');
            questionCard.className = 'fill-in-the-blank-card';
            questionCard.setAttribute('data-question-index', index);
            questionCard.setAttribute('data-question-type', q.type);
            const questionText = document.createElement('p');
            questionText.className = 'question-text';
            questionText.innerHTML = `${index + 1}. ${applyBoldFormatting(q.question)}`;
            questionCard.appendChild(questionText);
            const revealButton = document.createElement('button');
            revealButton.textContent = "Reveal Answer";
            revealButton.className = 'reveal-answer-button';
            revealButton.addEventListener('click', () => revealAnswer(index));
            questionCard.appendChild(revealButton);
            const revealedAnswer = document.createElement('p');
            revealedAnswer.className = 'revealed-answer';
            revealedAnswer.innerHTML = `Answer: ${applyBoldFormatting(q.correctAnswer)}`;
            questionCard.appendChild(revealedAnswer);
        }
        questionsSlideContainer.appendChild(questionCard);
    });
    if (window.MathJax) {
        window.MathJax.typesetPromise([questionsSlideContainer]).catch((err) => console.error("MathJax initial typesetting error:", err));
    }
    showQuestion(0, 'next'); // Start with 'next' for the initial slide-in
}

/**
 * Strips a prefix (like 'A.', '1.') from a string.
 * @param {string} text - The text to process.
 * @returns {string} The text with the prefix removed.
 */
function stripPrefix(text) {
    return text.replace(/^[A-Z]?\.?\s*|^[0-9]+\.\s*/, '');
}

/**
 * Applies bold formatting to text containing **...** syntax.
 * @param {string} text - The text to format.
 * @returns {string} The formatted HTML string.
 */
function applyBoldFormatting(text) {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

/**
 * Validates the structure of the loaded quiz data.
 * @param {object} data - The quiz data object.
 * @throws {Error} if the data structure is invalid.
 */
function validateQuizData(data) {
    if (!data || typeof data !== 'object') {
        throw new Error("Quiz data must be an object.");
    }
    if (typeof data.title !== 'string' || data.title.trim() === '') {
        throw new Error("Quiz must have a 'title' string.");
    }
    if (!Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error("Quiz must have a non-empty 'questions' array.");
    }
    data.questions.forEach((q, index) => {
        if (typeof q.type !== 'string' || !['multiple_choice', 'fill_in_the_blank'].includes(q.type)) {
            throw new Error(`Question ${index + 1} has an invalid or missing 'type'. Must be 'multiple_choice' or 'fill_in_the_blank'.`);
        }
        if (typeof q.question !== 'string' || q.question.trim() === '') {
            throw new Error(`Question ${index + 1} is missing 'question' text.`);
        }
        if (typeof q.correctAnswer !== 'string' || q.correctAnswer.trim() === '') {
            throw new Error(`Question ${index + 1} is missing 'correctAnswer'.`);
        }
        if (q.type === 'multiple_choice') {
            if (!Array.isArray(q.options) || q.options.length < 2) {
                throw new Error(`Multiple-choice question ${index + 1} must have at least two 'options'.`);
            }
            const trimmedCorrectAnswerLower = stripPrefix(q.correctAnswer).trim().toLowerCase();
            const trimmedOptionsLower = q.options.map(opt => stripPrefix(opt).trim().toLowerCase());
            if (!trimmedOptionsLower.includes(trimmedCorrectAnswerLower)) {
                throw new Error(`Correct answer for question ${index + 1} is not found in the options list.`);
            }
        }
    });
}

/**
 * Displays a specific question and updates navigation buttons with animation.
 * @param {number} index - The index of the question to show.
 * @param {string} direction - 'prev' or 'next' for animation direction.
 */
function showQuestion(index, direction) {
    const questionCards = questionsSlideContainer.querySelectorAll('.question-card, .fill-in-the-blank-card');
    if (index >= 0 && index < questionCards.length) {
        // Find the current active card to animate out
        const currentActiveCard = questionsSlideContainer.querySelector('.question-card.active, .fill-in-the-blank-card.active');
        if (currentActiveCard) {
            currentActiveCard.classList.remove('active');
            // Animate the old card out
            if (direction === 'next') {
                currentActiveCard.style.animation = 'slideOutToLeft 0.5s forwards';
            } else {
                currentActiveCard.style.animation = 'slideOutToRight 0.5s forwards';
            }
        }
        
        // Animate the new card in after a short delay
        setTimeout(() => {
            questionCards.forEach(card => card.style.animation = '');
            questionCards[index].classList.add('active');
            if (direction === 'next') {
                questionCards[index].style.animation = 'slideInFromRight 0.5s forwards';
            } else {
                questionCards[index].style.animation = 'slideInFromLeft 0.5s forwards';
            }
        }, 500); // Wait for the previous animation to finish

        currentQuestionIndex = index;
        questionCounter.textContent = `Question ${currentQuestionIndex + 1} of ${quizData.questions.length}`;
        prevQuestionButton.disabled = (currentQuestionIndex === 0);
        nextQuestionButton.disabled = (currentQuestionIndex === quizData.questions.length - 1);
    }
}

/**
 * Handles the live check functionality for multiple-choice questions.
 * @param {Event} event - The change event from the radio button.
 */
function handleLiveAnswer(event) {
    const selectedRadio = event.target;
    if (!selectedRadio) {
        console.error("handleLiveAnswer: event.target (selectedRadio) is null or undefined. Aborting.");
        return;
    }
    const questionIndex = parseInt(selectedRadio.getAttribute('data-question-index'));
    const questionData = quizData.questions[questionIndex];
    const questionCard = selectedRadio.closest('.question-card');
    if (!questionCard) {
        console.error("handleLiveAnswer: Could not find parent .question-card for selected radio.", selectedRadio);
        return;
    }
    const userAnswer = selectedRadio.value;
    const correctAnswer = questionData.correctAnswer;
    const isCorrect = (stripPrefix(userAnswer).trim().toLowerCase() === stripPrefix(correctAnswer).trim().toLowerCase());
    userAnswers[questionIndex] = {
        question: questionData.question,
        userAnswer: userAnswer,
        correctAnswer: correctAnswer,
        isCorrect: isCorrect,
        type: questionData.type
    };
    const optionLabels = questionCard.querySelectorAll('.option-label');
    optionLabels.forEach(label => {
        label.classList.remove('correct-live', 'incorrect-live');
    });
    const selectedOptionLabel = selectedRadio.closest('.option-label');
    if (selectedOptionLabel) {
        if (isCorrect) {
            selectedOptionLabel.classList.add('correct-live');
        } else {
            selectedOptionLabel.classList.add('incorrect-live');
            const correctOptionRadio = Array.from(questionCard.querySelectorAll('input[type="radio"]')).find(radio =>
                stripPrefix(radio.value).trim().toLowerCase() === stripPrefix(correctAnswer).trim().toLowerCase()
            );
            if (correctOptionRadio) {
                correctOptionRadio.closest('.option-label').classList.add('correct-live');
            }
        }
    }
    if (window.MathJax) {
        window.MathJax.typesetPromise([questionCard]).catch((err) => console.error("MathJax typesetting error in live check:", err));
    }
}

/**
 * Reveals the answer for a fill-in-the-blank question.
 * @param {number} index - The index of the question.
 */
function revealAnswer(index) {
    const questionCard = questionsSlideContainer.querySelector(`.fill-in-the-blank-card[data-question-index="${index}"]`);
    if (!questionCard) return;
    const revealButton = questionCard.querySelector('.reveal-answer-button');
    const revealedAnswer = questionCard.querySelector('.revealed-answer');
    if (revealButton && revealedAnswer) {
        revealButton.classList.add('hidden');
        revealedAnswer.classList.add('show');
        const questionData = quizData.questions[index];
        userAnswers[index] = {
            question: questionData.question,
            userAnswer: 'Answer Revealed',
            correctAnswer: questionData.correctAnswer,
            isCorrect: true,
            type: questionData.type
        };
        if (window.MathJax) {
            window.MathJax.typesetPromise([questionCard]).catch((err) => console.error("MathJax typesetting error in reveal:", err));
        }
    }
}

/**
 * Submits the quiz, calculates the score, and displays the results.
 */
function submitQuiz() {
    if (!quizData) {
        showError("No quiz loaded. Please select and load a quiz first.");
        return;
    }
    score = 0;
    let allMultipleChoiceAnswered = true;
    quizData.questions.forEach((q, index) => {
        if (q.type === 'multiple_choice') {
            const selectedOption = document.querySelector(`input[name="question-${index}"]:checked`);
            let userAnswer = null;
            let isCorrect = false;
            if (selectedOption) {
                userAnswer = selectedOption.value;
                if (stripPrefix(userAnswer).trim().toLowerCase() === stripPrefix(q.correctAnswer).trim().toLowerCase()) {
                    score++;
                    isCorrect = true;
                }
            } else {
                allMultipleChoiceAnswered = false;
            }
            userAnswers[index] = {
                question: q.question,
                userAnswer: userAnswer,
                correctAnswer: q.correctAnswer,
                isCorrect: isCorrect,
                type: q.type
            };
        } else if (q.type === 'fill_in_the_blank') {
            if (userAnswers[index] === null) {
                userAnswers[index] = {
                    question: q.question,
                    userAnswer: 'Not applicable (Flashcard)',
                    correctAnswer: q.correctAnswer,
                    isCorrect: false,
                    type: q.type
                };
            }
        }
    });
    if (!allMultipleChoiceAnswered && !liveCheckEnabled) {
        showError("Please answer all multiple-choice questions before submitting.");
        return;
    }
    quizSection.classList.add('fade-out');
    quizSection.addEventListener('animationend', () => {
        quizSection.classList.add('hidden');
        resultsSection.classList.remove('hidden');
        resultsSection.classList.add('fade-in');
    }, { once: true });
    
    const totalMultipleChoiceQuestions = quizData.questions.filter(q => q.type === 'multiple_choice').length;
    scoreDisplay.textContent = `You scored ${score} out of ${totalMultipleChoiceQuestions} on multiple-choice questions.`;
    displayResultsFeedback(score, totalMultipleChoiceQuestions);
    displayAnswerBreakdown();
}

/**
 * Displays a summary of the user's answers.
 */
function displayAnswerBreakdown() {
    feedbackContainer.innerHTML = '';
    userAnswers.forEach((answer, index) => {
        const feedbackItem = document.createElement('div');
        feedbackItem.className = `answer-feedback-item`;
        if (answer.type === 'multiple_choice') {
            if (!answer.isCorrect) {
                feedbackItem.classList.add('incorrect');
            }
        }
        const questionP = document.createElement('p');
        questionP.className = 'question-text';
        questionP.innerHTML = `${index + 1}. ${applyBoldFormatting(answer.question)}`;
        const yourAnswerP = document.createElement('p');
        yourAnswerP.className = 'your-answer';
        const userAnswerText = answer.userAnswer ? `Your Answer: ${applyBoldFormatting(answer.userAnswer)}` : "Your Answer: No answer provided";
        yourAnswerP.innerHTML = userAnswerText;
        const correctAnswerP = document.createElement('p');
        correctAnswerP.className = 'correct-answer';
        correctAnswerP.innerHTML = `Correct Answer: ${applyBoldFormatting(answer.correctAnswer)}`;
        feedbackItem.appendChild(questionP);
        feedbackItem.appendChild(yourAnswerP);
        feedbackItem.appendChild(correctAnswerP);
        const iconSpan = document.createElement('span');
        iconSpan.className = 'feedback-icon';
        if (answer.type === 'multiple_choice') {
            if (answer.isCorrect) {
                iconSpan.innerHTML = '✔️';
                iconSpan.classList.add('correct');
            } else {
                iconSpan.innerHTML = '❌';
                iconSpan.classList.add('incorrect');
            }
        } else {
            iconSpan.innerHTML = '🔍';
            iconSpan.classList.add('correct');
        }
        feedbackItem.appendChild(iconSpan);
        feedbackContainer.appendChild(feedbackItem);
    });
    if (window.MathJax) {
        window.MathJax.typesetPromise([feedbackContainer]).catch((err) => console.error("MathJax typesetting error in results:", err));
    }
}

/**
 * Displays a final feedback message based on the quiz score.
 * @param {number} finalScore - The final score.
 * @param {number} totalPossibleScore - The maximum possible score.
 */
function displayResultsFeedback(finalScore, totalPossibleScore) {
    feedbackMessage.classList.remove('hidden', 'pass', 'fail');
    if (totalPossibleScore > 0) {
        const percentage = (finalScore / totalPossibleScore) * 100;
        if (percentage === 100) {
            feedbackMessage.textContent = "Congratulations! You got all the multiple-choice answers correct!";
            feedbackMessage.classList.add('pass');
        } else if (percentage >= 50) {
            feedbackMessage.textContent = "Good effort! You did well on multiple-choice questions.";
            feedbackMessage.classList.add('pass');
        } else {
            feedbackMessage.textContent = "Keep practicing! You'll get there.";
            feedbackMessage.classList.add('fail');
        }
    } else {
        feedbackMessage.textContent = "You have completed the flashcard set!";
        feedbackMessage.classList.add('pass');
    }
}

/**
 * Resets the quiz to its initial state.
 */
function resetQuiz() {
    quizData = null;
    score = 0;
    userAnswers = [];
    liveCheckEnabled = false;
    currentQuestionIndex = 0;
    questionsSlideContainer.innerHTML = '';
    quizTitleElement.textContent = '';
    questionCounter.textContent = '';
    feedbackContainer.innerHTML = '';
    quizDropdown.value = "";
    shuffleQuestionsCheckbox.checked = false;
    shuffleOptionsCheckbox.checked = false;
    enableLiveCheckCheckbox.checked = false;
    prevQuestionButton.disabled = true;
    nextQuestionButton.disabled = true;

    resultsSection.classList.add('fade-out');
    resultsSection.addEventListener('animationend', () => {
        resultsSection.classList.add('hidden');
        quizSection.classList.add('hidden');
        quizSelectionSection.classList.remove('hidden');
        quizSelectionSection.classList.add('fade-in');
        hideError();
    }, { once: true });
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

