import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/StudentProgressCard.css';

const StudentProgressCard = ({ student }) => {
  const navigate = useNavigate();

  const viewDetails = () => {
    navigate(`/teacher/student/${student._id}`);
  };

  return (
    <div className="progress-card">
      <h3>{student.profile?.fullName}</h3>
      <p><strong>Grade:</strong> {student.profile?.grade}</p>
      <p><strong>Subjects:</strong> {student.profile?.subjects?.join(', ')}</p>

      <div className="stats">
        <p><strong>Avg Score:</strong> {student.progress?.averageScore?.toFixed(2)}%</p>
        <p><strong>Materials Completed:</strong> {student.progress?.completedMaterials?.length}</p>
        <p><strong>Assessments Attempted:</strong> {student.progress?.attemptedAssessments?.length}</p>
      </div>

      <div className="weak-areas">
        <strong>Weak Areas:</strong>
        {student.progress?.weakAreas?.length ? (
          <ul>
            {student.progress.weakAreas.map((area, idx) => (
              <li key={idx}>{area.topic}</li>
            ))}
          </ul>
        ) : (
          <p>None identified yet.</p>
        )}
      </div>

      <button onClick={viewDetails} className="details-btn">View Details</button>
    </div>
  );
};

export default StudentProgressCard;