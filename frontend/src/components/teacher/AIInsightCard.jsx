import React from 'react';
import '../../styles/AIInsightCard.css';

const AIInsightCard = ({ insight }) => {
  const { studentName, weakAreas, strongAreas, recommendations, predictedScore } = insight;

  return (
    <div className="insight-card">
      <h3>{studentName}</h3>

      <div className="section">
        <h4>🔍 Key Insights</h4>
        <p><strong>Predicted Next Score:</strong> <span className="predicted-score">{predictedScore}%</span></p>
      </div>

      <div className="section">
        <h4>⚠️ Weak Areas</h4>
        <ul>
          {weakAreas.map((area, idx) => (
            <li key={idx}>
              {area.topic} (Avg: {area.avgScore}%)
            </li>
          ))}
        </ul>
      </div>

      <div className="section">
        <h4>✅ Strong Areas</h4>
        <ul>
          {strongAreas.map((area, idx) => (
            <li key={idx}>{area.topic}</li>
          ))}
        </ul>
      </div>

      <div className="section">
        <h4> AI Recommendations</h4>
        <ul>
          {recommendations.map((rec, idx) => (
            <li key={idx}>{rec}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AIInsightCard;