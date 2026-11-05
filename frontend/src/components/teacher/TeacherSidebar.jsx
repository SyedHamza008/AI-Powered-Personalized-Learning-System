import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import '../../styles/TeacherSidebar.css';

const TeacherSidebar = () => {
  const location = useLocation();
  
  return (
    <div className="teacher-sidebar">
      <h2>Teacher Panel</h2>
      <nav>
        {/* Dashboard Link - Main teacher homepage */}
        <NavLink to="/teacher" end>🏠 Dashboard</NavLink>
        
        {/* Class Management Link - NEW: For managing classes and students */}
        <NavLink to="/teacher/class-management">📚 Class Management</NavLink>
        
        {/* Upload Material Link - For uploading study materials */}
        <NavLink to="/teacher/upload-material">📤 Upload Material</NavLink>

        {/* My Materials Link - For viewing and managing uploaded materials */}
        <NavLink to="/teacher/materials">📚 My Materials</NavLink>
        
        {/* Create Assessment Link - For creating tests and assignments */}
        <NavLink to="/teacher/create-assessment">📝 Create Assessment</NavLink>
        
        {/* My Assessments Link - NEW: For managing teacher's own assessments */}
        <NavLink to="/teacher/my-assessments">🗂️ My Assessments</NavLink>

        {/* Student Progress Link - For tracking student performance */}
        <NavLink to="/teacher/student-progress">📊 Student Progress</NavLink>
        
        {/* AI Insights Link - For AI-powered analytics */}
        <NavLink to="/teacher/ai-insights">🤖 AI Insights</NavLink>

      </nav>
    </div>
  );
};

export default TeacherSidebar;