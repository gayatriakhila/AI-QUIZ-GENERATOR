document.addEventListener('DOMContentLoaded', () => {
    const startPage = document.getElementById('start-page');
    const topicPage = document.getElementById('topic-page');
    const quizPage = document.getElementById('quiz-page');
    const resultPage = document.getElementById('result-page');

    const startQuizBtn = document.getElementById('start-quiz-btn');
    const startTestBtn = document.getElementById('start-test-btn');
    const restartBtn = document.getElementById('restart-btn');

    const nameInput = document.getElementById('name');
    const userNameDisplay = document.getElementById('user-name-display');
    const topicSelect = document.getElementById('topic-select');
    const difficultySelect = document.getElementById('difficulty-select');

    const questionEl = document.getElementById('question');
    const answersContainer = document.getElementById('answers-container');
    const timerEl = document.getElementById('timer');
    const resultsSummaryEl = document.getElementById('results-summary');
    const questionNumberDisplay = document.getElementById('question-number-display');
    
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const submitQuizBtn = document.getElementById('submit-quiz-btn');

    let userName = '';
    let questions = [];
    let currentQuestionIndex = 0;
    let score = 0;
    let timerInterval;
    let totalTimeLimitSeconds = 0;
    let quizTimeRemaining = 0;
    
    // Array to store user's choices (decoded text and the option letter)
    let userAnswers = []; 

    // Helper for option letters (Point 3)
    const optionLetters = ['A', 'B', 'C', 'D'];

    // Time limits in seconds
    const timeLimits = {
        'easy': 10 * 60, 
        'medium': 15 * 60, 
        'hard': 20 * 60, 
    };

    // Open Trivia DB category IDs
    const topicCategories = {
        'Science-Computers': 18,
        'science & nature': 17,
        'general knowledge': 9,
        'Science-Mathematics': 19,
        'sports': 21,
        'science-gadgets': 30,
    };

    startQuizBtn.addEventListener('click', () => {
        userName = nameInput.value.trim();
        if (userName) {
            startPage.style.display = 'none';
            topicPage.style.display = 'block';
            userNameDisplay.textContent = userName;
        } else {
            alert('Please enter your name.');
        }
    });

    startTestBtn.addEventListener('click', async () => {
        const topic = topicSelect.value;
        const difficulty = difficultySelect.value; 
        const categoryId = topicCategories[topic];

        if (!categoryId) {
            alert('Please choose a valid topic.');
            return;
        }

        totalTimeLimitSeconds = timeLimits[difficulty] || timeLimits['medium']; 
        quizTimeRemaining = totalTimeLimitSeconds;

        topicPage.style.display = 'none';
        quizPage.style.display = 'block';
        questionEl.textContent = 'Loading questions...';
        answersContainer.innerHTML = ''; 

        try {
            const response = await fetch(`https://opentdb.com/api.php?amount=10&category=${categoryId}&difficulty=${difficulty}&type=multiple`);
            const data = await response.json();
            
            if (data.response_code === 0) {
                questions = data.results.map(q => {
                    const answers = [...q.incorrect_answers, q.correct_answer];
                    // Shuffle the answers
                    for (let i = answers.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [answers[i], answers[j]] = [answers[j], answers[i]];
                    }
                    return {
                        question: q.question,
                        answers: answers,
                        correct: q.correct_answer,
                        // NEW: Store the answer order to determine the correct option letter later
                        shuffled_answers: answers
                    };
                });
                
                // Initialize userAnswers with correct answers decoded and placeholder for user choice
                userAnswers = questions.map(q => {
                    const correctDecoded = new DOMParser().parseFromString(q.correct, 'text/html').body.textContent;
                    // Find the correct option letter based on the shuffled array
                    const correctIndex = q.shuffled_answers.findIndex(a => a === q.correct);
                    const correctOptionName = optionLetters[correctIndex];

                    return {
                        question: q.question,
                        correctAnswerText: correctDecoded,
                        correctOptionName: correctOptionName, // The letter (A, B, C, D)
                        chosenAnswerText: null,             // The decoded text of the chosen answer
                        chosenOptionName: null,             // The letter (A, B, C, D)
                        isCorrect: false
                    };
                });

                currentQuestionIndex = 0;
                startQuizTimer();
                displayQuestion();
                updateNavigationButtons();

            } else {
                alert('Error fetching questions. Please try another topic or refresh.');
                restartQuiz();
            }
        } catch (error) {
            console.error('Fetch error:', error);
            alert('A network error occurred. Please check your connection and try again.');
            restartQuiz();
        }
    });

    // Overall Quiz Countdown Timer
    function startQuizTimer() {
        clearInterval(timerInterval);
        
        function updateTimerDisplay() {
            const minutes = String(Math.floor(quizTimeRemaining / 60)).padStart(2, '0');
            const seconds = String(quizTimeRemaining % 60).padStart(2, '0');
            timerEl.textContent = `Time Remaining: ${minutes}:${seconds}`;
            if (quizTimeRemaining <= 60) {
                timerEl.style.color = 'red';
            } else {
                 timerEl.style.color = 'inherit';
            }
        }

        updateTimerDisplay();

        timerInterval = setInterval(() => {
            quizTimeRemaining--;
            updateTimerDisplay();

            if (quizTimeRemaining <= 0) {
                clearInterval(timerInterval);
                alert("Time's up! Submitting your answers.");
                showResults(true);
            }
        }, 1000);
    }
    
    // Display Question and state selection
    function displayQuestion() {
        if (questions.length === 0) return;

        const currentQuestion = questions[currentQuestionIndex];
        const currentAnswerState = userAnswers[currentQuestionIndex];
        
        // Update Question Number Display (Point 3)
        questionNumberDisplay.textContent = `Question ${currentQuestionIndex + 1} of ${questions.length}`;

        // Decode HTML entities
        const decodedQuestion = new DOMParser().parseFromString(currentQuestion.question, 'text/html').body.textContent;
        questionEl.textContent = decodedQuestion;
        answersContainer.innerHTML = '';

        currentQuestion.answers.forEach((answer, index) => {
            const button = document.createElement('button');
            const decodedAnswer = new DOMParser().parseFromString(answer, 'text/html').body.textContent;
            
            // Add A, B, C, D prefix (Point 3)
            const optionName = optionLetters[index];
            button.textContent = `${optionName}. ${decodedAnswer}`;

            // Pre-select and highlight the button if the user has already answered it (Point 1)
            if (currentAnswerState.chosenAnswerText === decodedAnswer) {
                button.classList.add('selected'); 
            }

            // Pass both the option name (A,B,C,D) and the answer text
            button.addEventListener('click', () => handleAnswerSelection(button, decodedAnswer, optionName));
            answersContainer.appendChild(button);
        });

        updateNavigationButtons();
    }

    // Handle answer selection and update state (Point 1 & 3)
    function handleAnswerSelection(selectedButton, displayedAnswerText, optionName) {
        // Remove 'selected' class from all buttons
        answersContainer.querySelectorAll('button').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // Add 'selected' class to the clicked button (Point 1)
        selectedButton.classList.add('selected');

        // Update the userAnswers state (Point 4)
        userAnswers[currentQuestionIndex].chosenAnswerText = displayedAnswerText;
        userAnswers[currentQuestionIndex].chosenOptionName = optionName;
    }
    
    // Navigation handlers
    prevBtn.addEventListener('click', () => {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            displayQuestion();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentQuestionIndex < questions.length - 1) {
            currentQuestionIndex++;
            displayQuestion();
        } else {
            submitQuizBtn.click(); 
        }
    });

    submitQuizBtn.addEventListener('click', () => {
        const answeredCount = userAnswers.filter(a => a.chosenAnswerText !== null).length;
        if (answeredCount < questions.length) {
            if (!confirm(`You have only answered ${answeredCount} out of ${questions.length} questions. Are you sure you want to submit?`)) {
                return;
            }
        }
        showResults(false);
    });

    // Update button states
    function updateNavigationButtons() {
        prevBtn.disabled = currentQuestionIndex === 0;

        if (currentQuestionIndex === questions.length - 1) {
            nextBtn.style.display = 'none';
            submitQuizBtn.style.display = 'block';
        } else {
            nextBtn.style.display = 'block';
            submitQuizBtn.style.display = 'none';
        }
    }


    // Show final results (Point 4)
    function showResults(timedOut) {
        clearInterval(timerInterval);
        quizPage.style.display = 'none';
        resultPage.style.display = 'block';

        // 1. Calculate final score and set isCorrect flag
        score = 0;
        userAnswers.forEach(answer => {
            const isCorrect = answer.chosenAnswerText !== null && answer.chosenAnswerText === answer.correctAnswerText;
            answer.isCorrect = isCorrect;
            if (isCorrect) {
                score++;
            }
        });

        // 2. Calculate Time Spent
        const timeSpent = totalTimeLimitSeconds - Math.max(0, quizTimeRemaining);
        const finalMinutes = String(Math.floor(timeSpent / 60)).padStart(2, '0');
        const finalSeconds = String(timeSpent % 60).padStart(2, '0');
        
        // 3. Display Summary
        resultsSummaryEl.innerHTML = `
            <h3>${userName}, your quiz is complete!</h3>
            ${timedOut ? '<p style="color:red; font-weight:bold;">TIME EXPIRED! Unanswered questions were marked as incorrect.</p>' : ''}
            <p>Time Spent: ${finalMinutes}:${finalSeconds}</p>
            <p>You scored <strong>${score}</strong> out of ${questions.length} questions.</p>
            <hr>
            <h4>Detailed Results</h4>
        `;

        // 4. Display Detailed Results (Point 4)
        userAnswers.forEach((result, index) => {
            const resultItem = document.createElement('div');
            resultItem.classList.add('result-item');
            
            const decodedQuestion = new DOMParser().parseFromString(questions[index].question, 'text/html').body.textContent;
            
            let chosenOptionName = result.chosenOptionName || '—';
            let chosenText = result.chosenAnswerText || 'No Answer';
            let chosenAnswerClass = 'no-answer'; 
            
            if (result.chosenAnswerText) {
                chosenAnswerClass = result.isCorrect ? 'correct-answer' : 'incorrect-answer';
            } 

            // Display option letters and answer text (Point 4)
            resultItem.innerHTML = `
                <p><strong>Question ${index + 1}:</strong> ${decodedQuestion}</p>
                <p>Your answer: 
                    <span class="${chosenAnswerClass}">(${chosenOptionName}) ${chosenText}</span>
                </p>
                <p>Correct answer: 
                    <span class="correct-answer">(${result.correctOptionName}) ${result.correctAnswerText}</span>
                </p>
            `;
            resultsSummaryEl.appendChild(resultItem);
        });
    }


    function restartQuiz() {
        score = 0;
        currentQuestionIndex = 0;
        userAnswers = [];
        totalTimeLimitSeconds = 0;
        quizTimeRemaining = 0;
        resultPage.style.display = 'none';
        startPage.style.display = 'block';
        timerEl.textContent = 'Time Remaining: 00:00';
        nameInput.value = '';
        clearInterval(timerInterval);
        prevBtn.disabled = true;
        nextBtn.style.display = 'block';
        submitQuizBtn.style.display = 'none';
    }

    restartBtn.addEventListener('click', restartQuiz);

});
