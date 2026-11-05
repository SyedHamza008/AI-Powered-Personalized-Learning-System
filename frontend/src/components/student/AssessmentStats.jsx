import React from 'react';
import '../../styles/AssessmentStats.css';

const AssessmentStats = ({ stats }) => {
  return (
    <div className="assessment-stats">
      <div className="stat-box">
        <span className="number">{stats.totalPending || 0}</span>
        <span className="label">Pending</span>
      </div>
      <div className="stat-box">
        <span className="number">{stats.totalCompleted || 0}</span>
        <span className="label">Completed</span>
      </div>
      <div className="stat-box">
        <span className="number">{stats.averageScore || 0}%</span>
        <span className="label">Avg Score</span>
      </div>
    </div>
  );
};

export default AssessmentStats;