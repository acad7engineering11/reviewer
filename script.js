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

function populateQuizDropdown() {
    availableQuizzes.forEach(quizFileName => {
        const option = document.createElement('option');
        option.value = quizFileName;
        option.textContent = quizFileName.replace('.json', '');
        quizDropdown.appendChild(option);
    });
}

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
                if (q.type === 'multiple_choice') {
                    shuffleArray(q.options);
                }
            });
        }
        displayQuiz(quizData);
        hideError();
    } catch (error) {
        showError(`Failed to load or parse quiz. Error: ${error.message}`);
        console.error("Quiz loading error:", error);
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function stripPrefix(text) {
    return text.replace(/^[a-z]\.\s*/, '');
}

function applyBoldFormatting(text) {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

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
                throw new Error(`Multiple-choice question ${index + 1}: 'correctAnswer' must be one of the 'options'.`);
            }
        } else if (q.type === 'fill_in_the_blank') {
            if (q.options !== undefined && !Array.isArray(q.options)) {
                 throw new Error(`Fill-in-the-blank question ${index + 1}: 'options' field, if present, must be an array.`);
            }
        }
    });
}

function displayQuiz(data) {
    quizData = data;
    score = 0;
    userAnswers = Array(quizData.questions.length).fill(null);
    currentQuestionIndex = 0;
    quizSelectionSection.classList.add('hidden');
    resultsSection.classList.add('hidden');
    quizSection.classList.remove('hidden');
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
            revealButton.className = 'reveal-answer-button';
            revealButton.textContent = 'Reveal Answer';
            revealButton.setAttribute('data-question-index', index);
            revealButton.addEventListener('click', handleRevealAnswer);
            questionCard.appendChild(revealButton);
            const revealedAnswerDiv = document.createElement('div');
            revealedAnswerDiv.className = 'revealed-answer';
            revealedAnswerDiv.innerHTML = applyBoldFormatting(q.correctAnswer);
            questionCard.appendChild(revealedAnswerDiv);
        }
        questionsSlideContainer.appendChild(questionCard);
    });
    showQuestion(currentQuestionIndex);
}

function showQuestion(index) {
    if (!quizData || !quizData.questions || quizData.questions.length === 0) {
        return;
    }
    if (index < 0) {
        index = 0;
    } else if (index >= quizData.questions.length) {
        index = quizData.questions.length - 1;
    }
    currentQuestionIndex = index;
    const allQuestionCards = questionsSlideContainer.querySelectorAll('.question-card, .fill-in-the-blank-card');
    allQuestionCards.forEach(card => card.classList.remove('active'));
    const currentCard = questionsSlideContainer.querySelector(`[data-question-index="${currentQuestionIndex}"]`);
    if (currentCard) {
        currentCard.classList.add('active');
        if (window.MathJax) {
            window.MathJax.typesetPromise([currentCard]).catch((err) => console.error("MathJax typesetting error:", err));
        }
    }
    questionCounter.textContent = `Question ${currentQuestionIndex + 1} of ${quizData.questions.length}`;
    prevQuestionButton.disabled = (currentQuestionIndex === 0);
    nextQuestionButton.disabled = (currentQuestionIndex === quizData.questions.length - 1);
}

function handleLiveAnswer(event) {
    const selectedRadio = event.target;
    if (!selectedRadio) {
        console.error("handleLiveAnswer: event.target is null or undefined.");
        return;
    }
    const questionIndex = parseInt(selectedRadio.getAttribute('data-question-index'));
    const questionData = quizData.questions[questionIndex];
    const questionCard = selectedRadio.closest('.question-card');
    if (!questionCard) {
        console.error("handleLiveAnswer: Could not find parent .question-card.");
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
                const correctOptionLabel = correctOptionRadio.closest('.option-label');
                if (correctOptionLabel) {
                    correctOptionLabel.classList.add('correct-live');
                }
            }
        }
    }
    if (window.MathJax) {
        window.MathJax.typesetPromise([questionCard]).catch((err) => console.error("MathJax typesetting error:", err));
    }
}

function handleRevealAnswer(event) {
    const button = event.target;
    const questionIndex = parseInt(button.getAttribute('data-question-index'));
    const questionData = quizData.questions[questionIndex];
    const questionCard = button.closest('.fill-in-the-blank-card');
    const revealedAnswerDiv = questionCard.querySelector('.revealed-answer');
    revealedAnswerDiv.classList.add('show');
    button.disabled = true;
    userAnswers[questionIndex] = {
        question: questionData.question,
        userAnswer: 'Answer Revealed',
        correctAnswer: questionData.correctAnswer,
        isCorrect: true,
        type: questionData.type
    };
    if (window.MathJax) {
        window.MathJax.typesetPromise([questionCard]).catch((err) => console.error("MathJax typesetting error:", err));
    }
}

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
    displayResults(score, quizData.questions.length);
}

function displayResults(finalScore, totalQuestions) {
    quizSection.classList.add('hidden');
    resultsSection.classList.remove('hidden');
    const totalPossibleScore = quizData.questions.filter(q => q.type === 'multiple_choice').length;
    scoreDisplay.textContent = `You scored ${finalScore} out of ${totalPossibleScore} on multiple-choice questions!`;
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
        feedbackItem.appendChild(questionP);
        if (answer.type === 'multiple_choice') {
            const yourAnswerP = document.createElement('p');
            yourAnswerP.className = 'your-answer';
            yourAnswerP.innerHTML = `Your Answer: ${applyBoldFormatting(answer.userAnswer || 'Not answered')} <span class="feedback-icon ${answer.isCorrect ? 'correct' : 'incorrect'}">${answer.isCorrect ? '&#10003;' : '&#10007;'}</span>`;
            feedbackItem.appendChild(yourAnswerP);
            if (!answer.isCorrect) {
                const correctAnswerP = document.createElement('p');
                correctAnswerP.className = 'correct-answer';
                correctAnswerP.innerHTML = `Correct Answer: ${applyBoldFormatting(answer.correctAnswer)}`;
                feedbackItem.appendChild(correctAnswerP);
            }
        } else if (answer.type === 'fill_in_the_blank') {
            const correctAnswerP = document.createElement('p');
            correctAnswerP.className = 'correct-answer';
            correctAnswerP.innerHTML = `Answer: ${applyBoldFormatting(answer.correctAnswer)}`;
            feedbackItem.appendChild(correctAnswerP);
        }
        feedbackContainer.appendChild(feedbackItem);
    });
    if (window.MathJax) {
        window.MathJax.typesetPromise([feedbackContainer]).catch((err) => console.error("MathJax typesetting error:", err));
    }
}

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
    resultsSection.classList.add('hidden');
    quizSection.classList.add('hidden');
    quizSelectionSection.classList.remove('hidden');
    hideError();
}

function showError(message) {
    errorMessageElement.textContent = message;
    errorMessageElement.classList.remove('hidden');
}

function hideError() {
    errorMessageElement.classList.add('hidden');
    errorMessageElement.textContent = '';
}
