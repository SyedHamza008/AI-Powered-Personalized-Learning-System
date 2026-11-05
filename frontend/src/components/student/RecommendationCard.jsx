import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/RecommendationCard.css';

const RecommendationCard = ({ item, type }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (type === 'material') {
      // Handle materials with multiple files
      if (item.files && item.files.length > 0) {
        if (item.files.length === 1) {
          window.open(item.files[0].url, '_blank');
        } else {
          // You might want to show a modal to select which file to open
          alert('This material has multiple files. Please select one to view.');
          // Or implement a modal here
        }
      } 
      // Handle materials with direct contentUrl
      else if (item.contentUrl) {
        window.open(item.contentUrl, '_blank');
      } else {
        alert('No content available for this material');
      }
    } else if (type === 'quiz') {
      navigate(`/student/assessments/take/${item._id}`);
    }
  };

  return (
    <div className="recommendation-card" onClick={handleClick}>
      <h4>{item.title}</h4>
      <p>{item.description || item.reason}</p>
      <div className="meta">
        <span className="type">{item.type}</span>
        <span className="difficulty">{item.difficulty}</span>
        {item.estimatedTime && <span className="time">{item.estimatedTime} min</span>}
      </div>
      {item.topics && (
        <div className="topics">
          {item.topics.map((topic, index) => (
            <span key={index} className="topic-tag">{topic}</span>
          ))}
        </div>
      )}
      {type === 'material' && item.files && (
        <div className="file-count">
          {item.files.length} file{item.files.length > 1 ? 's' : ''} available
        </div>
      )}
    </div>
  );
};

export default RecommendationCard;