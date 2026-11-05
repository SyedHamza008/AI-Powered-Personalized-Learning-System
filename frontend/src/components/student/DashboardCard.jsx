import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/DashboardCard.css';

const DashboardCard = ({ title, description, link, icon }) => {
  const navigate = useNavigate();

  return (
    <div className="dashboard-card" onClick={() => navigate(link)}>
      <div className="icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
};

export default DashboardCard;