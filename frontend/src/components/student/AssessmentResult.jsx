// AssessmentResult.jsx
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import '../../styles/AssessmentResult.css';

const AssessmentResult = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const result = location.state || null; // Get result data from navigation state
  const { id } = useParams();

  console.log("URL ID:", id);
  console.log("Location", location.state);
  console.log("Result.success:", result?.success);

  if (!result || !result.success) {
    return (
      <div className="assessment-result">
        <h1>⚠️ No Result Found</h1>
        <p>It looks like you didn't submit an assessment.</p>
        <button onClick={() => navigate('/student/assessments')} className="back-btn">
          Go to Assessments
        </button>
      </div>
    );
  }
console.log("✅ Result received:", result);

  const handleBackToDashboard = () => {
    navigate('/student/assessments');
  };

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A': return '#27ae60'; 
      case 'B': return '#f39c12'; 
      case 'C': return '#e67e22'; 
      case 'F': return '#e74c3c'; 
      default: return '#7f8c8d';
    }
  };

  const displayResult = (resultStr) => {
  const lower = (resultStr || '').toLowerCase();
  if (lower === 'pass') return '✅ Passed';
  if (lower === 'fail') return '❌ Failed';
  return 'Result Pending';
};

  return (
    <div className="assessment-result">
      <h1>🎉 Assessment Completed!</h1>

      <div className="result-card">
        <div className="header">
          <h2>{result.subject || 'Unknown Subject'}</h2>
          <p>Quiz ID: {result.quiz_id || 'N/A'}</p>
        </div>

        <div className="score-box" style={{ borderColor: getGradeColor(result.grade) }}>
          <div className="score">
            <span className="number">{result.score !== undefined ? `${result.score}%` : 'N/A'}</span>
            <span className="grade" style={{ color: getGradeColor(result.grade) }}>
              Grade: {result.grade || 'N/A'}
            </span>
          </div>
          <div className={`status ${result.result?.toLowerCase() || 'unknown'}`}>
            Status: {displayResult(result.result)}
         </div>
        </div>

        <div className="details">
          <p>
            <strong>Attempted On:</strong> {result.attempt_date 
              ? new Date(result.attempt_date).toLocaleString() 
              : 'N/A'}
          </p>
        </div>
      </div>

      <button onClick={handleBackToDashboard} className="back-btn">
        Back to My Assessments
      </button>
    </div>
  );
};

export default AssessmentResult;