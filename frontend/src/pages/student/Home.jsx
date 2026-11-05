import React, { useState, useEffect, use } from 'react';
import DashboardCard from '../../components/student/DashboardCard';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Logout from '../../components/Logout';
import NewMaterialCard from '../../components/student/NewMaterialCard';
import AssessmentStats from '../../components/student/AssessmentStats';
import api from '../../api';
import '../../styles/StudentHome.css';

const Home = () => {
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newMaterials, setNewMaterials] = useState([]);
  const [assessmentStats, setAssessmentStats] = useState({});
  const [aiRecommendations, setAiRecommendations] = useState([]);

  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!currentUser.id){
        setLoading(false);
        return;
      }
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/students/data`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error('Failed to fetch profile');

        const data = await response.json();
        setStudentData(data.data); // e.g., { id: "...", name: "Hassan Mehmood", ... }
      } catch (err) {
        console.error('Error fetching student profile:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStudentData();
  }, [currentUser?.id]);


  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch new materials
      const materialsResponse = await fetch('/api/materials/new', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const materialsData = await materialsResponse.json();
      setNewMaterials(materialsData.materials);

      // Fetch assessment stats
      const statsResponse = await fetch('/api/assessments/student/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const statsData = await statsResponse.json();
      setAssessmentStats(statsData.stats);

      // Fetch AI recommendations
      const aiResponse = await fetch('/api/ai/recommendations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const aiData = await aiResponse.json();
      setAiRecommendations(aiData.recommendations);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  if (loading) {
    return (
      <div className='student-home'>
        <div>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='student-home'>
        <div>Error: {error}</div>
      </div>
    );
  }

  const displayName = studentData?.name || currentUser?.username || 'Student';
  const displayRole = currentUser?.role || 'student';

  const greeting = () => {
    switch (displayRole) {
      case 'teacher':
        return `Welcome back, Teacher ${displayName} 👋`;
      case 'admin':
        return `Welcome back, Admin ${displayName} 👋`;
      default:
        return `Welcome back, ${displayName} 👋`;
    }
  };

  return (
    <div className="student-home">
    <button className="logout-button">
      <Logout />
    </button>
  <h1 className="hero-title">{greeting()}</h1>
    <p className="hero-sub">Your personalised learning journey continues here.</p>
    
    <div className="cta-grid">
      <div className="cta-card" onClick={() => navigate('/student/assessments')}>
        <div className="cta-icon">📝</div>
        <div className="cta-label">Take Assessment</div>
      </div>

      <div className="cta-card" onClick={() => navigate('/student/progress')}>
        <div className="cta-icon">📊</div>
        <div className="cta-label">View Progress</div>
      </div>

      <div className="cta-card" onClick={() => navigate('/student/chatbot')}>
        <div className="cta-icon">🤖</div>
        <div className="cta-label">AI Tutor</div>
      </div>

      <div className="cta-card" onClick={() => navigate('/student/materials')}>
        <div className="cta-icon">📚</div>
        <div className="cta-label">Materials</div>
      </div>

      <div className="cta-card" onClick={() => navigate('/student/materials')}>
        <div className="cta-icon">📚</div>
        <div className="cta-label">Extra Materials 
          <form action="" method="get">
            <label for="name_material">Material Name</label>
            <input type="text" /> 
          </form>
        </div>
      </div>
    </div>
  </div>
  );
};

export default Home;