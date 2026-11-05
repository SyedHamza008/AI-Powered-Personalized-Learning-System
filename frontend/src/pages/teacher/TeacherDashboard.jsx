import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';

// Components
import TeacherSidebar from '../../components/teacher/TeacherSidebar';
import TeacherHome from './TeacherHome';
import ClassManagement from './ClassManagement';
import UploadMaterial from './UploadMaterial';
import TeacherMaterialsPage from './TeacherMaterialsPage';
import CreateAssessment from './CreateAssessment';
import MyAssessments from './MyAssessments';
import StudentProgress from './StudentProgress';
import AIInsights from './AIInsights';
import StudentDetail from './StudentDetail';

const TeacherDashboard = () => {
  const [loading, setLoading] = useState(true);
  const { logout } = useAuth(); // ✅ Get logout function
  const navigate = useNavigate();

  // validate auth on mount
  useEffect(() => {
    const validateAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Session expired. Please log in again.');
        logout();
        navigate('/login', { replace: true });
        return;
      }

      try {
        const response = await fetch('/api/teachers/dashboard', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          toast.error('Session expired. Please log in again.');
          logout();
          return;
        }

      } catch (error) {
        console.error('Auth validation error:', error);
        toast.error('Unable to verify session. Please log in again.');
        logout();
        return;
      } finally {
        setLoading(false);
      }
    };

    validateAuth();
  }, [logout]);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
  <div className="flex">
    <div className="teacher-dashboard">
      <TeacherSidebar />
      <div className="dashboard-content">
        <main className="flex-1 ml-64 p-6">
        <Routes>
          <Route path="/" element={<TeacherHome />} />
          <Route path="/class-management" element={<ClassManagement />} />
          <Route path="/upload-material" element={<UploadMaterial />} />
          <Route path="/materials" element={<TeacherMaterialsPage />} />
          <Route path="/create-assessment" element={<CreateAssessment />} />
          <Route path="/my-assessments" element={<MyAssessments />} />
          <Route path="/student-progress" element={<StudentProgress />} />
          <Route path="/student/:studentId" element={<StudentDetail />} />
          <Route path="/ai-insights" element={<AIInsights />} />
          <Route path="*" element={<div style={{ color: 'red' }}>Page Not Found</div>} />
        </Routes>
        </main>
      </div>
    </div>
   </div> 
  );
};

export default TeacherDashboard;