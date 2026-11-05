import React, { useEffect, useState } from 'react';
import '../../styles/ManageClasses.css';

const ManageClasses = () => {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [activeTab, setActiveTab] = useState('permissions');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newClass, setNewClass] = useState({
    title: '',
    subject: '',
    description: ''
  });
  
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchClasses();
    fetchStudents();
    fetchTeachers();
  }, []);

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/groups', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        console.log('Classes data:', data);
        setClasses(data.groups || data.classes || []);
      }
    } catch (err) {
      console.error('Failed to fetch classes:', err);
      setError('Failed to fetch classes');
    }
  };

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/students', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        console.log('Students data:', data);
        setStudents(data.students || []);
      }
    } catch (err) {
      console.error('Failed to fetch students:', err);
    }
  };

  const fetchTeachers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/teachers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        console.log('Teachers data:', data);
        setTeachers(data.teachers || []);
      }
    } catch (err) {
      console.error('Failed to fetch teachers:', err);
    }
  };

  // Fetch full class details with members
  const fetchClassDetails = async (classId) => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      console.log('Fetching class details for:', classId);
      
      const res = await fetch(`/api/admin/groups/${classId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log('Class details response:', data);
        
        if (data.success && data.group) {
          // Ensure we have both ClassId and groupId for compatibility
          const classData = {
            ...data.group,
            ClassId: data.group.groupId || data.group.ClassId || classId,
            groupId: data.group.groupId || data.group.ClassId || classId
          };
          
          console.log('Setting selected class:', classData);
          setSelectedClass(classData);
        } else {
          console.error('Invalid response format:', data);
          setError('Invalid response format');
        }
      } else {
        console.error('Failed to fetch class details:', res.statusText);
        setError('Failed to fetch class details. Please try again.');
      }
    } catch (err) {
      console.error('Failed to fetch class details:', err);
      setError('Failed to fetch class details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/groups/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newClass),
      });
      
      if (res.ok) {
        setShowCreateForm(false);
        setNewClass({ title: '', subject: '', description: '' });
        fetchClasses();
      }
    } catch (err) {
      console.error('Failed to create class:', err);
    }
  };
  // Handle permission toggle
  const handlePermissionChange = async (key, value) => {
    if (!selectedClass) return;

    // Optimistic UI Update (makes it feel instant)
    const updatedPermissions = { 
        ...(selectedClass.permissions || {}), 
        [key]: value 
    };

    setSelectedClass(prev => ({
        ...prev,
        permissions: updatedPermissions
    }));

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/admin/groups/${selectedClass.ClassId}/permissions`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ permissions: updatedPermissions }),
        });

        if (!res.ok) {
            throw new Error("Failed to save");
        }
        // Optionally: flash a success message
    } catch (err) {
        console.error("Error updating permissions:", err);
        // Revert change on error
        alert("Failed to save permission setting.");
        fetchClassDetails(selectedClass.ClassId); // Reload original state
    }
  };
  const handleDeleteClass = async () => {
    if (!deleteConfirm) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/groups/${deleteConfirm.ClassId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        fetchClasses();
        setDeleteConfirm(null);
        if (selectedClass?.ClassId === deleteConfirm.ClassId) {
          setSelectedClass(null);
        }
      } else {
        const errorData = await res.json();
        alert(`Failed to delete class: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to delete class:', err);
      alert('Failed to delete class. Please try again.');
    }
  };

  const handleAddMember = async (classId, memberId) => {
    if (!classId || classId === 'undefined') {
      console.error('Invalid classId:', classId);
      alert('Error: Class ID is invalid. Please close and reopen the modal.');
      return;
    }

    if (!memberId) return; // Don't add if no selection
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/groups/${classId}/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ memberId }),
      });
      
      if (res.ok) {
        // Refresh the class details to show updated members
        fetchClassDetails(classId);
        fetchClasses(); // Update member count on class card
        // Reset dropdowns
        const studentSelect = document.getElementById(`student-select-${classId}`);
        const teacherSelect = document.getElementById(`teacher-select-${classId}`);
        if (studentSelect) studentSelect.value = '';
        if (teacherSelect) teacherSelect.value = '';
      } else {
        const errorData = await res.json();
        alert(`Failed to add member: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to add member:', err);
      alert('Failed to add member. Please try again.');
    }
  };

  // Remove member function
  const handleRemoveMember = async (classId, memberId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/groups/${classId}/members/${memberId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        fetchClassDetails(classId);
        fetchClasses(); // Update member count on class card
      }
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  return (
    <div className="manage-classes">
      <div className="page-header">
        <h1>Class Management</h1>
        <button 
          className="btn-primary"
          onClick={() => setShowCreateForm(true)}
        >
          ➕ Create New Class
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Loading Display */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">Loading...</div>
        </div>
      )}

      {/* Create Class Modal */}
      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Create New Class</h3>
              <button onClick={() => setShowCreateForm(false)}>×</button>
            </div>
            <form onSubmit={handleCreateClass}>
              <div className="form-group">
                <label>Class Title</label>
                <input
                  type="text"
                  placeholder="Enter class title"
                  value={newClass.title}
                  onChange={(e) => setNewClass({...newClass, title: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Subject</label>
                <input
                  type="text"
                  placeholder="Enter subject"
                  value={newClass.subject}
                  onChange={(e) => setNewClass({...newClass, subject: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  placeholder="Enter description (optional)"
                  value={newClass.description}
                  onChange={(e) => setNewClass({...newClass, description: e.target.value})}
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary">Create Class</button>
                <button type="button" className="btn-secondary" onClick={() => setShowCreateForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Confirm Deletion</h3>
              <button onClick={() => setDeleteConfirm(null)}>×</button>
            </div>
            <div style={{ padding: '20px' }}>
              <p>
                Are you sure you want to delete the class <strong>"{deleteConfirm.title}"</strong>?
                This action cannot be undone.
              </p>
              <div className="form-actions">
                <button className="btn-danger" onClick={handleDeleteClass}>
                  Yes, Delete Class
                </button>
                <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Class Cards */}
      <div className="classes-grid">
        {classes.map(classItem => (
          <div key={classItem.ClassId} className="class-card">
            <h3>{classItem.title}</h3>
            <p>{classItem.subject}</p>
            <span className="member-count">{classItem.memberCount} members</span>
            
            <div className="class-actions">
              <button 
                className="btn-primary btn-sm"
                onClick={() => fetchClassDetails(classItem.ClassId)}
              >
                Manage Members
              </button>
              
              <button 
                className="btn-danger btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirm(classItem);
                }}
                title="Delete this class"
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Manage Members Modal */}
      {selectedClass && (
  <div className="modal-overlay">
    <div className="modal large">
      <div className="modal-header">
        <h3>Manage: {selectedClass.title}</h3>
        <button onClick={() => setSelectedClass(null)}>×</button>
      </div>

      {/* TAB NAVIGATION */}
      <div className="modal-tabs">
        <button 
          className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          Members
        </button>
        <button 
          className={`tab-btn ${activeTab === 'permissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('permissions')}
        >
          Permissions & Settings
        </button>
      </div>
      
      {/* TAB 1: MEMBERS CONTENT */}
      {activeTab === 'members' && (
        <div className="member-management">
          <div className="add-member-section">
            <h4>Add Students</h4>
            <select 
              id={`student-select-${selectedClass.ClassId}`}
              onChange={(e) => handleAddMember(selectedClass.ClassId, e.target.value)}
            >
              <option value="">Select student...</option>
              {students
                .filter(student => !selectedClass.members?.some(m => m.id === student.studentId))
                .map(student => (
                  <option key={student.studentId} value={student.studentId}>
                    {student.name} ({student.email})
                  </option>
                ))}
            </select>
          </div>

          <div className="add-member-section">
            <h4>Add Teachers</h4>
            <select 
              id={`teacher-select-${selectedClass.ClassId}`}
              onChange={(e) => handleAddMember(selectedClass.ClassId, e.target.value)}
            >
              <option value="">Select teacher...</option>
              {teachers
                .filter(teacher => !selectedClass.members?.some(m => m.id === teacher.teacherId))
                .map(teacher => (
                  <option key={teacher.teacherId} value={teacher.teacherId}>
                    {teacher.name} ({teacher.email})
                  </option>
                ))}
            </select>
          </div>

          <div className="current-members">
            <h4>Class Members ({selectedClass.memberCount || 0})</h4>
            {selectedClass.members && selectedClass.members.length > 0 ? (
              <div className="members-list">
                {selectedClass.members.map(member => (
                  <div key={member.id} className="member-item">
                    <span className="member-name">
                      {member.name} 
                      <span className={`member-role ${member.role}`}>
                        ({member.role})
                      </span>
                    </span>
                    <button 
                      className="btn-danger btn-sm"
                      onClick={() => handleRemoveMember(selectedClass.ClassId, member.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-members">No members in this class yet.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PERMISSIONS CONTENT */}
      {activeTab === 'permissions' && (
        <div className="permissions-panel">
            <div className="permission-item">
                <div className="perm-info">
                    <h4>Hide Student Names</h4>
                    <p>If enabled, teachers in this class will not see student names (only IDs or Anonymized labels).</p>
                </div>
                <div className="perm-control">
                    <label className="switch">
                        <input 
                            type="checkbox" 
                            checked={selectedClass.permissions?.hideStudentNames || false}
                            onChange={(e) => handlePermissionChange('hideStudentNames', e.target.checked)}
                        />
                        <span className="slider round"></span>
                    </label>
                </div>
            </div>
            
            {/* Placeholder for future settings */}
            <div className="permission-item disabled">
                <div className="perm-info">
                    <h4>Disable Chat (Coming Soon)</h4>
                    <p>Prevent students from posting in the group chat.</p>
                </div>
                <div className="perm-control">
                   <label className="switch disabled">
                        <input type="checkbox" disabled />
                        <span className="slider round"></span>
                    </label>
                </div>
            </div>
        </div>
      )}

    </div>
  </div>
)}
    </div>
  );
};

export default ManageClasses;