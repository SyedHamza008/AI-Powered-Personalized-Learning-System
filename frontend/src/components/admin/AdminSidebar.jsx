import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import '../../styles/AdminSidebar.css';

const AdminSidebar = () => {
  const location = useLocation();
  const adminName = localStorage.getItem('username') || 'Admin';

  return (
    <div className="admin-sidebar">
      <div className="sidebar-header">
        <h2>Admin Panel</h2>
        <p>Welcome, {adminName}</p>
      </div>
      <nav>
        <NavLink to="/admin" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          🏠 Dashboard
        </NavLink>
        <NavLink to="/admin/users" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          👥 Manage Users
        </NavLink>
        <NavLink to="/admin/classes" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          📚 Manage Classes
        </NavLink>
        <NavLink to="/admin/database" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          🗄️ Maintain Database
        </NavLink>
      </nav>
      
      <div className="sidebar-footer">
        <button 
          className="logout-btn"
          onClick={() => {
            localStorage.clear();
            window.location.href = '/login';
          }}
        >
          🚪 Logout
        </button>
      </div>
    </div>
  );
};

export default AdminSidebar;