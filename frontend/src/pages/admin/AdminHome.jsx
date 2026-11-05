import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/AdminHome.css';

const AdminHome = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalUsers: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [adminData, setAdminData] = useState(null);
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
// Admin Fetch Admin Data if role is admin
  useEffect(() => {
    const fetchAdminData = async () => {
      if (!currentUser.id) {
        setLoading(false);
        return;
      }
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admins/data`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error('Failed to fetch profile');

        const data = await response.json();
        setAdminData(data.data); // e.g., { id: "...", name: "Jane Smith", ... }
      } catch (err) {
        console.error('Error fetching admin profile:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    if (loading) return <div>Loading...</div>; // wait for loading to finish
    if (error) console.error('Admin Home Error:', error);
    };
    fetchAdminData();
  }, [currentUser?.id]);

  useEffect(() => {
    fetchDashboardStats();
    fetchRecentActivity();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/dashboard-stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch admin stats:', err);
    }
  };

  const fetchRecentActivity = async () => {
    // Mock recent activity - you can implement real activity logs
    // setRecentActivity([
    //   // { action: 'New user registered', time: '2 hours ago', type: 'user' },
    //   // { action: 'Class "Mathematics 101" created', time: '4 hours ago', type: 'class' },
    //   // { action: 'Student promoted to teacher', time: '1 day ago', type: 'role' }
    // ]);
  };

  const displayName = adminData ? adminData.name : 'Admin';

  return (
    <div className="admin-home">
      <div className="welcome-section">
        <h1>Welcome to the Admin Dashboard 👨‍💼 {displayName}</h1>
        <p>Manage the AI Learning Platform system-wide operations</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card" onClick={() => navigate('/admin/users')}>
          <div className="stat-icon">👨‍🎓</div>
          <div className="stat-content">
            <h3>{stats.totalStudents}</h3>
            <p>Total Students</p>
          </div>
        </div>
        
        <div className="stat-card" onClick={() => navigate('/admin/users')}>
          <div className="stat-icon">👨‍🏫</div>
          <div className="stat-content">
            <h3>{stats.totalTeachers}</h3>
            <p>Total Teachers</p>
          </div>
        </div>
        
        <div className="stat-card" onClick={() => navigate('/admin/classes')}>
          <div className="stat-icon">📚</div>
          <div className="stat-content">
            <h3>{stats.totalClasses}</h3>
            <p>Total Classes</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>{stats.totalUsers}</h3>
            <p>Total Users</p>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="action-buttons">
            <button onClick={() => navigate('/admin/users?action=create')}>
              ➕ Create New User
            </button>
            <button onClick={() => navigate('/admin/classes?action=create')}>
              🏫 Create New Class
            </button>
            <button onClick={() => navigate('/admin/users')}>
              🔄 Manage Roles
            </button>
            <button onClick={() => navigate('/admin/database')}>
              🗄️ Maintain Database
            </button>
          </div>
        </div>

{/*         <div className="recent-activity">
          <h2>Recent Activity</h2>
          <div className="activity-list">
            {recentActivity.map((activity, index) => (
              <div key={index} className={`activity-item ${activity.type}`}>
                <span className="activity-action">{activity.action}</span>
                <span className="activity-time">{activity.time}</span>
              </div>
            ))}
          </div>
        </div> */}
      </div>
    </div>
  );
};

export default AdminHome;