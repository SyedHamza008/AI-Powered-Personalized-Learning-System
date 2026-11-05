import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.jsx';
import PrivateRoute from './components/PrivateRoute.jsx';

import Landing from './pages/Landing';
import Register from './pages/Register'; 
import Login from './pages/Login';

import StudentDashboard from './pages/student/StudentDashboard';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';

import StudentOnboard from "./pages/onboard/StudentOnboard";
import TeacherOnboard from "./pages/onboard/TeacherOnboard";
import AdminOnboard from "./pages/onboard/AdminOnboard";
import UploadMaterial from './pages/teacher/UploadMaterial.jsx';


import './App.css';

// Loading component
function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="text-xl">Loading...</div>
    </div>
  );
}

// Main routes component
function App() {
  const { currentUser, onboarded, loading, authChecked } = useAuth();

  // Show loading until auth check is complete
  if (loading || !authChecked) {
    return <LoadingSpinner />;
  }

  console.log('App rendering with auth state:', { currentUser, onboarded, loading, authChecked });

  return (
    <Routes>
      {/* Public routes - redirect if already authenticated */}
      <Route path="/" element={
        !currentUser ? <Landing /> : <Navigate to={onboarded ? `/${currentUser.role}` : `/onboard/${currentUser.role}`} replace />
      } />
      
      <Route path="/login" element={
        !currentUser ? <Login /> : <Navigate to={onboarded ? `/${currentUser.role}` : `/onboard/${currentUser.role}`} replace />
      } />
      
      <Route path="/register" element={
        !currentUser ? <Register /> : <Navigate to={onboarded ? `/${currentUser.role}` : `/onboard/${currentUser.role}`} replace />
      } />

      {/* Onboarding Routes */}
      <Route path="/onboard/student" element={
        <PrivateRoute allowedRoles={['student']} requireOnboarded={false}>
          <StudentOnboard />
        </PrivateRoute>
      } />
      
      <Route path="/onboard/teacher" element={
        <PrivateRoute allowedRoles={['teacher']} requireOnboarded={false}>
          <TeacherOnboard />
        </PrivateRoute>
      } />
      
      <Route path="/onboard/admin" element={
        <PrivateRoute allowedRoles={['admin']} requireOnboarded={false}>
          <AdminOnboard />
        </PrivateRoute>
      } />

      {/* Dashboard Routes */}
      <Route path="/student/*" element={
        <PrivateRoute allowedRoles={['student']} requireOnboarded={true}>
          <StudentDashboard />
        </PrivateRoute>
      } />

      <Route path="/teacher/upload" element={
        <PrivateRoute allowedRoles={['teacher', 'admin']}>
          <UploadMaterial />
        </PrivateRoute>
      } />
      
      <Route path="/teacher/*" element={
        <PrivateRoute allowedRoles={['teacher']} requireOnboarded={true}>
          <TeacherDashboard />
        </PrivateRoute>
      } />
      
      <Route path="/admin/*" element={
        <PrivateRoute allowedRoles={['admin']} requireOnboarded={true}>
          <AdminDashboard />
        </PrivateRoute>
      } />

      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;