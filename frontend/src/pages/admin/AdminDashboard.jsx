import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminSidebar from '../../components/admin/AdminSidebar.jsx';
import AdminHome from './AdminHome';
import ManageUsers from './ManageUsers';
import ManageClasses from './ManageClasses';
import MaintainDatabase from './MaintainDatabase.jsx';
import '../../styles/AdminDashboard.css';

const AdminDashboard = () => {
  return (
    <div className="admin-dashboard">
      <AdminSidebar />
      <div className="dashboard-content">
        <Routes>
          <Route path="/" element={<AdminHome />} />
          <Route path="/users" element={<ManageUsers />} />
          <Route path="/classes" element={<ManageClasses />} />
          <Route path="/database" element={<MaintainDatabase />} />
        </Routes>
      </div>
    </div>
  );
};

export default AdminDashboard;