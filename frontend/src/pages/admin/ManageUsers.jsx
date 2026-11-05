import React, { useEffect, useState } from 'react';
import '../../styles/ManageUsers.css';

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    role: 'student',
    name: '',
    department: '',
    education: '',
    gradeLevel: ''
  });

  useEffect(() => {
    fetchAllUsers();
  }, []);

  const fetchAllUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch students
      const studentsRes = await fetch('/api/admin/students', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      let studentsData = { students: [] };
      if (studentsRes.ok) {
        studentsData = await studentsRes.json();
        setStudents(studentsData.students || []);
      }

      // Fetch teachers
      const teachersRes = await fetch('/api/admin/teachers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      let teachersData = { teachers: [] };
      if (teachersRes.ok) {
        teachersData = await teachersRes.json();
        setTeachers(teachersData.teachers || []);
      }

      // Combine all users
      setUsers([...(studentsData?.students || []), ...(teachersData?.teachers || [])]);

    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });
      
      if (res.ok) {
        setShowCreateForm(false);
        setNewUser({
          username: '', email: '', password: '', role: 'student',
          name: '', department: '', education: '', gradeLevel: ''
        });
        fetchAllUsers();
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Failed to create user');
      }
    } catch (err) {
      console.error('Failed to create user:', err);
      alert('Failed to create user');
    }
  };

  const handlePromoteStudent = async (studentId, studentName) => {
    if (window.confirm(`Promote ${studentName} to teacher?`)) {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/admin/promote-student', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            studentId: studentId,
            department: 'General',
            education: 'B.Ed'
          }),
        });
        
        if (res.ok) {
          alert('Student promoted to teacher successfully!');
          fetchAllUsers();
        } else {
          const errorData = await res.json();
          alert(errorData.error || 'Failed to promote student');
        }
      } catch (err) {
        console.error('Failed to promote student:', err);
        alert('Failed to promote student');
      }
    }
  };

  const filteredUsers = activeTab === 'all' ? users : 
                       activeTab === 'students' ? students : teachers;

  return (
    <div className="manage-users">
      <div className="page-header">
        <h1>User Management</h1>
        <button 
          className="btn-primary"
          onClick={() => setShowCreateForm(true)}
        >
          ➕ Create New User
        </button>
      </div>

      <div className="tabs">
        <button 
          className={activeTab === 'all' ? 'active' : ''}
          onClick={() => setActiveTab('all')}
        >
          All Users ({users.length})
        </button>
        <button 
          className={activeTab === 'students' ? 'active' : ''}
          onClick={() => setActiveTab('students')}
        >
          Students ({students.length})
        </button>
        <button 
          className={activeTab === 'teachers' ? 'active' : ''}
          onClick={() => setActiveTab('teachers')}
        >
          Teachers ({teachers.length})
        </button>
      </div>

      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Create New User</h3>
              <button onClick={() => setShowCreateForm(false)}>×</button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label>Username *</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Role *</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                </select>
              </div>
              
              {newUser.role === 'student' && (
                <div className="form-group">
                  <label>Grade Level</label>
                  <input
                    type="text"
                    value={newUser.gradeLevel}
                    onChange={(e) => setNewUser({...newUser, gradeLevel: e.target.value})}
                    placeholder="e.g., Grade 10"
                  />
                </div>
              )}
              
              {newUser.role === 'teacher' && (
                <>
                  <div className="form-group">
                    <label>Department</label>
                    <input
                      type="text"
                      value={newUser.department}
                      onChange={(e) => setNewUser({...newUser, department: e.target.value})}
                      placeholder="e.g., Mathematics"
                    />
                  </div>
                  <div className="form-group">
                    <label>Education</label>
                    <input
                      type="text"
                      value={newUser.education}
                      onChange={(e) => setNewUser({...newUser, education: e.target.value})}
                      placeholder="e.g., M.Ed"
                    />
                  </div>
                </>
              )}
              
              <div className="form-actions">
                <button type="submit" className="btn-primary">Create User</button>
                <button type="button" onClick={() => setShowCreateForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="users-grid">
        {filteredUsers.map(user => (
          <div key={user.userId} className="user-card">
            <div className="user-info">
              <h4>{user.name}</h4>
              <p>{user.email}</p>
              <span className={`role-badge ${user.userRole}`}>{user.userRole}</span>
              {user.gradeLevel && <span className="user-detail">Grade: {user.gradeLevel}</span>}
              {user.department && <span className="user-detail">Dept: {user.department}</span>}
            </div>
            <div className="user-actions">
              {user.userRole === 'student' && (
                <button 
                  className="btn-promote"
                  onClick={() => handlePromoteStudent(user.studentId, user.name)}
                >
                  Promote to Teacher
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="empty-state">
          <p>No users found</p>
        </div>
      )}
    </div>
  );
};

export default ManageUsers;