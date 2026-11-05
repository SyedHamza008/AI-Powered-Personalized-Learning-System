// pages/teacher/TeacherHome.jsx
import React, { useEffect, useState } from 'react';
import Logout from '../../components/Logout';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom'; // ✅ Added for redirect
import '../../styles/TeacherHome.css';

const TeacherHome = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalMaterials: 0,
    totalAssessments: 0,
    pendingSubmissions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teacherData, setTeacherData] = useState(null);

  const { currentUser, logout } = useAuth(); // 
  const navigate = useNavigate(); // For redirection

  useEffect(() => {
    if (!currentUser) {
      // If no user, log out and redirect to login
      setError('Session expired or invalid');
      setLoading(false);
      logout();
      navigate('/login', { replace: true });
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('No token found');
      setLoading(false);
      logout();
      navigate('/login', { replace: true });
      return;
    }

    const fetchTeacherData = async () => {
      try {
        const response = await fetch('/api/assessments/teachers/data', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Session expired. Please log in again.');
          }
          throw new Error(`Profile fetch failed: ${response.status}`);
        }

        const data = await response.json();
        setTeacherData(data.data);
      } catch (err) {
        console.error('Error fetching teacher profile:', err);
        setError(err.message);
        // ✅ Auto-logout on 401
        if (err.message.includes('Session expired')) {
          logout();
          navigate('/login', { replace: true });
        }
      } finally {
        setLoading(false);
      }
    };

    const fetchTeacherStats = async () => {
      try {
        const res = await fetch('/api/assessments/teacher/dashboard-stats', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          if (res.status === 401) {
            throw new Error('Session expired. Please log in again.');
          }
          throw new Error(`Stats fetch failed: ${res.status}`);
        }

        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch teacher stats:', err);
        if (!error && err.message.includes('Session expired')) {
          setError(err.message);
          logout();
          navigate('/login', { replace: true });
        } else if (!error) {
          setError('Unable to load dashboard statistics');
        }
      }
    };

    fetchTeacherData();
    fetchTeacherStats();
  }, [currentUser, logout, navigate]); // ✅ Dependencies

  // Refetch stats on custom event
  useEffect(() => {
    const handleRefetch = () => {
      if (currentUser) {
        const token = localStorage.getItem('token');
        fetch('/api/assessments/teacher/dashboard-stats', {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then(res => res.json())
          .then(data => setStats(data))
          .catch(err => console.error('Refetch stats error:', err));
      }
    };

    window.addEventListener('refetchDashboardStats', handleRefetch);
    return () => window.removeEventListener('refetchDashboardStats', handleRefetch);
  }, [currentUser]);

  // UI States
  if (loading) return <p className="loading">Loading dashboard...</p>;
  if (error) return <p className="error">Error: {error}</p>;
  if (!teacherData) return <p className="error">No teacher data found.</p>;

  const displayName = teacherData.name || teacherData.username || 'Teacher';

  return (
    <div className="teacher-home">
      <Logout />
      <h1>Welcome to Your Teacher Dashboard, {displayName}!</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>{stats.totalStudents}</h3>
          <p>Total Students</p>
        </div>
        <div className="stat-card">
          <h3>{stats.totalMaterials}</h3>
          <p>Materials Uploaded</p>
        </div>
        <div className="stat-card">
          <h3>{stats.totalAssessments}</h3>
          <p>Assessments Created</p>
        </div>
        <div className="stat-card">
          <h3>{stats.pendingSubmissions}</h3>
          <p>Pending Submissions</p>
        </div>
      </div>

      <div className="quick-actions">
        <button onClick={() => navigate('/teacher/upload-material')}>
          📤 Upload New Material
        </button>
        <button onClick={() => navigate('/teacher/create-assessment')}>
          📝 Create Assessment
        </button>
      </div>
    </div>
  );
};

export default TeacherHome;