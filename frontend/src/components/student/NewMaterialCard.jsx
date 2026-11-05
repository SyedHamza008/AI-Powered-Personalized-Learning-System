import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/NewMaterialCard.css';

const NewMaterialCard = ({ material }) => {
  const navigate = useNavigate();

  const openMaterial = () => {
    window.open(material.contentUrl, '_blank');
  };

  return (
    <div className="new-material-card" onClick={openMaterial}>
      <span className="badge">NEW</span>
      <h4>{material.title}</h4>
      <p>{material.description}</p>
      <div className="meta">
        <span className="subject">{material.subject}</span>
        <span className="type">{material.type}</span>
      </div>
      <div className="footer">
        <span className="time">⏱️ {material.estimatedTime} min</span>
      </div>
    </div>
  );
};

export default NewMaterialCard;