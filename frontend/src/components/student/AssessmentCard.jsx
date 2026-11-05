import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/AssessmentCard.css';

const AssessmentCard = ({ assessment, status }) => {
  
  const navigate = useNavigate();

  const startAssessment = () => {
navigate(`/student/assessments/take/${assessment.assessmentId}`);
  };


  const viewResult = () => {
    navigate(`/student/assessments/result/${assessment.assessmentId}`, {
      state: {
        success: true,
        score: assessment.score,
        grade: assessment.grade,
        result: assessment.result,        // 'pass' or 'fail'
        subject: assessment.subject,   // Subject name
        quiz_id: assessment.assessmentId,
        attempt_date: assessment.submittedAt,
      },
    });
  };

  return (
    <div className="assessment-card">
      <h3>{assessment.title}</h3>
      <p>{assessment.description}</p>
      <div className="meta">
        <span className="subject">{assessment.subject}</span>
        <span className="grade">{assessment.grade}</span>
      </div>
      <div className="footer">
        <span className="time">⏱️ {assessment.timeLimit} min</span>
        <span className="due">Due: {new Date(assessment.dueDate).toLocaleString()}</span>
      </div>

      {status === 'pending' ? (
        <button onClick={startAssessment} className="start-btn">Start</button>
      ) : (
        <button onClick={viewResult} className="result-btn">View Result</button>
      )}
    </div>
  );
};

export default AssessmentCard;