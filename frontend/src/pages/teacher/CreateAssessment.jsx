import React, { useState } from 'react';
import '../../styles/CreateAssessment.css';

const CreateAssessment = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [grade, setGrade] = useState('');
  const [timeLimit, setTimeLimit] = useState(30);
  const [dueDate, setDueDate] = useState('');
  const [questions, setQuestions] = useState([
    { question: '', options: ['', '', '', ''], correct: 0 },
  ]);

  // Grading scale
  const [gradingScale, setGradingScale] = useState([
    { minScore: 80, grade: 'A', result: 'Pass' },
    { minScore: 60, grade: 'B', result: 'Pass' },
    { minScore: 40, grade: 'C', result: 'Pass' },
    { minScore: 0, grade: 'F', result: 'Fail' },
  ]);

  const handleQuestionChange = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  const handleOptionChange = (qIndex, oIndex, value) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = value;
    setQuestions(updated);
  };

  const handleGradeRuleChange = (index, field, value) => {
    const updated = [...gradingScale];
    if (field === 'minScore') {
      updated[index][field] = parseFloat(value);
    } else {
      updated[index][field] = value;
    }
    setGradingScale(updated);
  };

  const addGradeRule = () => {
    setGradingScale([...gradingScale, { minScore: 0, grade: '', result: '' }]);
  };

  const removeGradeRule = (index) => {
    setGradingScale(gradingScale.filter((_, i) => i !== index));
  };

  const addQuestion = () => {
    setQuestions([...questions, { question: '', options: ['', '', '', ''], correct: 0 }]);
  };

  const removeQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validScale = gradingScale.filter(rule => !isNaN(rule.minScore) && rule.grade && rule.result);
    if (validScale.length === 0) {
      alert('❌ Please define at least one valid grading scale rule.');
      return;
    };
    
    const payload = {
      title,
      description,
      subject,
      topic,
      grade,
      timeLimit: parseInt(timeLimit),
      dueDate,
      questions: questions.map((q) => ({
        ...q,
        correct: parseInt(q.correct),
      })),
      totalMarks: questions.length,
      gradingScale: gradingScale
        .map(rule => ({
          minScore: parseFloat(rule.minScore),
          grade: rule.grade.trim(),
          result: rule.result.trim()
        }))
        .filter(rule => !isNaN(rule.minScore) && rule.grade && rule.result)
        .sort((a, b) => b.minScore - a.minScore), 
    };

    try {
      const res = await fetch('/api/assessments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        alert('✅ Assessment created successfully!');
        // Reset form
        setTitle('');
        setDescription('');
        setSubject('');
        setTopic('');
        setGrade('');
        setTimeLimit(30);
        setDueDate('');
        setQuestions([{ question: '', options: ['', '', '', ''], correct: 0 }]);
        setGradingScale([
          { minScore: 80, grade: 'A', result: 'Pass' },
          { minScore: 60, grade: 'B', result: 'Pass' },
          { minScore: 40, grade: 'C', result: 'Pass' },
          { minScore: 0, grade: 'F', result: 'Fail' },
        ]);
      } else {
        alert('❌ Failed to create assessment.');
      }
    } catch (err) {
      console.error(err);
      alert('❌ Network error.');
    }
  };
  

  return (
    <div className="create-assessment">
      <h1>Create New Assessment</h1>
      <form onSubmit={handleSubmit} className="assessment-form">
        <label>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />

        <label>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} required />

        <label>Subject</label>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} required />

        <label>Topic</label>
        <input value={topic} onChange={(e) => setTopic(e.target.value)} required />

        <label>Grade</label>
        <input type='number' value={grade} onChange={(e) => setGrade(e.target.value)} required />

        <label>Time Limit (minutes)</label>
        <input
          type="number"
          value={timeLimit}
          onChange={(e) => setTimeLimit(e.target.value)}
          min="5"
          max="180"
          required
        />

        <label>Due Date</label>
        <input
          type="datetime-local"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          required
        />

         <h3>Grading Scale</h3>
        <p className="hint">Define grade thresholds (sorted from highest to lowest)</p>
        {gradingScale.map((rule, idx) => (
          <div key={idx} className="grade-rule">
            <label>Min Score</label>
            <input
              type="number"
              step="1"
              value={rule.minScore ?? 0}
              onChange={(e) => handleGradeRuleChange(idx, 'minScore', e.target.value)}
              required
            />
            <label>Grade Label</label>
            <input
              value={rule.grade}
              onChange={(e) => handleGradeRuleChange(idx, 'grade', e.target.value)}
              placeholder="e.g., A, Distinction"
              required
            />
            <label>Result</label>
            <select
              value={rule.result}
              onChange={(e) => handleGradeRuleChange(idx, 'result', e.target.value)}
              required
            >
              <option value="Pass">Pass</option>
              <option value="Fail">Fail</option>
              <option value="Merit">Merit</option>
              <option value="Distinction">Distinction</option>
            </select>
            <button
              type="button"
              onClick={() => removeGradeRule(idx)}
              className="remove-btn"
              disabled={gradingScale.length <= 1}
            >
              Remove Rule
            </button>
          </div>
        ))}
        <button type="button" onClick={addGradeRule} className="add-question-btn">
          + Add Grade Rule
        </button>

        <h3>Questions</h3>
        {questions.map((q, qIndex) => (
          <div key={qIndex} className="question-block">
            <label>Question {qIndex + 1}</label>
            <input
              value={q.question}
              onChange={(e) => handleQuestionChange(qIndex, 'question', e.target.value)}
              required
            />

            {q.options.map((opt, oIndex) => (
              <div key={oIndex} className="option-row">
                <input
                  placeholder={`Option ${oIndex + 1}`}
                  value={opt}
                  onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                  required
                />
                <label>
                  <input
                    type="radio"
                    name={`correct-${qIndex}`}
                    checked={parseInt(q.correct) === oIndex}
                    onChange={() => handleQuestionChange(qIndex, 'correct', oIndex)}
                  />
                  Correct
                </label>
              </div>
            ))}

            <button type="button" onClick={() => removeQuestion(qIndex)} className="remove-btn">
              Remove Question
            </button>
          </div>
        ))}

        <button type="button" onClick={addQuestion} className="add-question-btn">
          + Add Question
        </button>

        <button type="submit" className="submit-btn">Create Assessment</button>
      </form>
    </div>
  );
};

export default CreateAssessment;