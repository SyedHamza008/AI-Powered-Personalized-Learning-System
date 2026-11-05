import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import '../../styles/TakeAssessment.css';

const TakeAssessment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [isTimerUp, setIsTimerUp] = useState(false);

  const handleSubmit = async () => {
  if (isTimerUp) {
    alert("Time is already up! Assessment was auto-submitted.");
    return;
  }

  const selectedAnswers = [];
  assessment.questions.forEach((_, idx) => {
    const radios = document.getElementsByName(`q${idx}`);
    let selected = null;
    for (let i = 0; i < radios.length; i++) {
      if (radios[i].checked) {
        selected = parseInt(radios[i].value);
        break;
      }
    }
    selectedAnswers.push(selected);
  });

  if (selectedAnswers.some(ans => ans === null)) {
    alert("Please answer all questions before submitting.");
    return;
  }

  // ✅ Clear timer to avoid auto-submit conflict
  setIsTimerUp(true);

  const timeSpentSec = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

  try {
    const res = await fetch(`/api/assessments/${id}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        answers: selectedAnswers,
        timeSpentSec: timeSpentSec
      })
    });
    const data = await res.json();
    if (res.ok) {
      navigate(`/student/assessments/result/${id}`, { state: data });
    } else {
      alert(data.error || 'Submission failed');
      // Re-enable timer if needed? (optional)
    }
  } catch (err) {
    console.error('Submission error:', err);
    alert(err.message);
    setIsTimerUp(false); // optional: allow retry
  }
};

const autoSubmit = useCallback(async () => {
  if (isTimerUp) return;
  alert("Time is up! Your assessment will be submitted automatically.");

  const selectedAnswers = [];
  assessment.questions.forEach((_, idx) => {
    const radios = document.getElementsByName(`q${idx}`);
    let selected = null;
    for (let i = 0; i < radios.length; i++) {
      if (radios[i].checked) {
        selected = parseInt(radios[i].value);
        break;
      }
    }
    selectedAnswers.push(selected);
  });

  // Validate all questions answered
  if (selectedAnswers.some(ans => ans === null)) {
    alert("Please answer all questions before submitting.");
    return;
  }

  const timeSpentSec = Math.floor((Date.now() - startTime) / 1000) || 1; // At least 1 sec
  console.log("Submitting answers:", selectedAnswers);
  console.log("Time spent (sec):", timeSpentSec);
  try {
    const res = await fetch(`/api/assessments/${id}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        answers: selectedAnswers,
        timeSpentSec: timeSpentSec
      })
    });
    if (res.ok) {
      navigate(`/student/assessments/result/${id}`, { state: data });
    } else {
      alert('Auto-submit failed: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    console.error('Auto-submit error:', err);
    alert('Failed to auto-submit. Please contact support.');
  }
}, [isTimerUp, assessment, id, navigate, startTime]);

  useEffect(() => {
    const fetchAssessment = async () => {
      try {
        const res = await fetch(`/api/assessments/${id}/questions`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load');
        setAssessment(data);
        const start = Date.now();
        setStartTime(start);
        
        const totalSeconds = (data.timeLimit || 0) * 60;
        setTimeLeft(totalSeconds);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAssessment();
  }, [id]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsTimerUp(true);
          clearInterval(timer);
          autoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isTimerUp, startTime]);

  if (loading) return <div>Loading assessment...</div>;
  if (error) return <div>Error: {error} <button onClick={() => navigate(-1)}>Go Back</button></div>;
  if (!assessment) return <div>No assessment found.</div>;

  // ✅ Safety check: ensure questions is an array
  if (!Array.isArray(assessment.questions)) {
    return <div>Questions data is invalid. Please contact admin.</div>;
  }

  return (
    <div className="take-assessment">
      <h1>{assessment.title || 'Assessment'}</h1>
      <p><strong>Subject:</strong> {assessment.subject || 'N/A'}</p>
      <p><strong>Time Limit:</strong> {assessment.timeLimit || 'N/A'} minutes</p>
      {assessment && (
  <div className="timer-banner">
    ⏱️ Time Remaining: 
    <strong style={{ color: timeLeft < 60 ? 'red' : 'green' }}>
      {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
    </strong>
  </div>
)}
      <p><strong>Total Marks:</strong> {assessment.totalMarks || 'N/A'}</p>
      <hr />
      {assessment.questions.length === 0 ? (
        <p>No questions found.</p>
      ) : (
        assessment.questions.map((q, idx) => (
          <div key={idx} className="question">
            <h3>Q{idx + 1}: {q.question || 'No question text'}</h3>
            {Array.isArray(q.options) ? (
              q.options.map((opt, i) => (
                <div key={i}>
                  <label>
                    <input type="radio" name={`q${idx}`} value={i} /> {opt}
                  </label>
                </div>
              ))
            ) : (
              <p>Options not available.</p>
            )}
          </div>
        ))
      )}
      <button onClick={handleSubmit} className="submit-btn">
      Submit Assessment
      </button>
    </div>
  );
};

export default TakeAssessment;