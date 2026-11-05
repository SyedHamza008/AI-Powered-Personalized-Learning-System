// StudentDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext'; 

// ... other imports
import Sidebar from '../../components/student/Sidebar';           
import Home from './Home';                                       
import LearningMaterials from './LearningMaterials';             
import MyAssessments from './MyAssessments';                     
import TakeAssessment from './TakeAssessment';                   
import AssessmentResult from '../../components/student/AssessmentResult'; 
import ProgressTracker from './ProgressTracker';                 
import AIRecommendations from './AIRecommendations';         
import StudentChatbot from './StudentChatbot';

const StudentDashboard = () => {
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { logout } = useAuth(); // ✅ Get logout from context

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          toast.error('Session expired. Please log in again.');
          logout(); // ✅ Triggers context update
          return;
        }

        const response = await fetch('/api/students/dashboard', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.status === 401) {
          toast.error('Session expired. Please log in again.');
          logout(); // ✅ This updates currentUser → triggers route redirect
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to load data');
        }

        const data = await response.json();
        setStudentData(data);
      } catch (error) {
        console.error('Fetch error:', error);
        toast.error('Failed to load dashboard. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [logout]); 

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="student-dashboard">
      <Sidebar />
      <div className="dashboard-content">
        <Routes>
          <Route path="/" element={<Home studentData={studentData} />} />
          <Route path="/materials" element={<LearningMaterials />} />
          <Route path="/assessments" element={<MyAssessments />} />
          <Route path="/assessments/take/:id" element={<TakeAssessment />} />
          <Route path="/assessments/result/:id" element={<AssessmentResult />} />
          <Route path="/progress" element={<ProgressTracker />} />
          <Route path="/recommendations" element={<AIRecommendations />} />
          <Route path="/chatbot" element={<StudentChatbot />} />
          <Route path="*" element={<div style={{ color: 'red' }}>Page Not Found</div>} />
        </Routes>
      </div>
    </div>
  );
};

export default StudentDashboard;