import React from 'react';
import { NavLink } from 'react-router-dom';
import '../../styles/StudentSidebar.css';

const Sidebar = () => {
  return (
    <div className="student-sidebar">
      <h2>Student Panel</h2>
      <nav>
        <NavLink to="/student" end>🏠 Dashboard</NavLink>
        <NavLink to="/student/materials">📚 Learning Materials</NavLink>
        <NavLink to="/student/assessments">📝 My Assessments</NavLink>
        <NavLink to="/student/progress">📊 Progress Tracker</NavLink>
        <NavLink to="/student/recommendations">🤖 AI Recommendations</NavLink>
        <NavLink to="/student/chatbot">💬 AI Tutor</NavLink>
      </nav>
    </div>
  );
};

export default Sidebar;