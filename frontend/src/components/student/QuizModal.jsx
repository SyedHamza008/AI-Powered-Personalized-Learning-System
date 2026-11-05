import React, { useState } from 'react';
import '../../styles/QuizModal.css';

const QuizModal = ({ quizData, onClose }) => {
  // Store user answers: { questionIndex: selectedOptionIndex }
  const [userAnswers, setUserAnswers] = useState({});

  if (!quizData) return null;

  const handleOptionClick = (questionIndex, optionIndex) => {
    // Prevent changing answer if already answered
    if (userAnswers.hasOwnProperty(questionIndex)) return;

    setUserAnswers({
      ...userAnswers,
      [questionIndex]: optionIndex,
    });
  };

  const getOptionClass = (qIndex, optIndex, correctIndex) => {
    // If user hasn't answered this question yet
    if (!userAnswers.hasOwnProperty(qIndex)) return "option-btn";

    const selected = userAnswers[qIndex];

    // 1. If this option is the Correct one -> Show Green
    if (optIndex === correctIndex) return "option-btn correct";

    // 2. If this option was selected by user AND it's Wrong -> Show Red
    if (selected === optIndex && selected !== correctIndex) return "option-btn wrong";

    // 3. Otherwise, dim it
    return "option-btn disabled";
  };

  return (
    <div className="quiz-overlay">
      <div className="quiz-container">
        {/* Header */}
        <div className="quiz-header">
          <h2>{quizData.quizTitle}</h2>
          <span className="badge">{quizData.difficulty}</span>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        {/* Scrollable Content */}
        <div className="quiz-body">
          {quizData.questions.map((q, qIndex) => (
            <div key={qIndex} className="question-card">
              <h3>{qIndex + 1}. {q.question}</h3>
              
              <div className="options-grid">
                {q.options.map((option, optIndex) => (
                  <button
                    key={optIndex}
                    className={getOptionClass(qIndex, optIndex, q.correctAnswer)}
                    onClick={() => handleOptionClick(qIndex, optIndex)}
                  >
                    {option}
                  </button>
                ))}
              </div>

              {/* Show Explanation ONLY after answering */}
              {userAnswers.hasOwnProperty(qIndex) && (
                <div className="explanation-box">
                  <strong>
                    {userAnswers[qIndex] === q.correctAnswer ? "✅ Correct!" : "❌ Incorrect."}
                  </strong>
                  <p>{q.explanation}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuizModal;