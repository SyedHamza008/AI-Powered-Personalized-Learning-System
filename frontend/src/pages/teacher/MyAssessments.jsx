import React, { useEffect, useState } from 'react';
import '../../styles/MyAssessments.css';

const MyAssessments = () => {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    try {
      const res = await fetch('/api/assessments/teacher', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setAssessments(data.assessments || []);
    } catch (err) {
      console.error('Failed to fetch assessments:', err);
    } finally {
      setLoading(false);
    }
  };

  const reassignAssessment = async (assessmentId, title) => {
    if (!window.confirm(`Re-assign "${title}" to all current students in your classes?`)) return;

    try {
      const res = await fetch(`/api/assessments/${assessmentId}/reassign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      const result = await res.json();
      alert(res.ok ? `✅ ${result.message}` : `❌ ${result.error || 'Failed'}`);
      if (res.ok) fetchAssessments(); // refresh
    } catch (err) {
      alert('❌ Network error during re-assignment.');
    }
  };

  const removeAssessment = async (assessmentId, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/assessments/${assessmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const result = await res.json();
      alert(res.ok ? `✅ ${result.message}` : `❌ ${result.error || 'Failed'}`);
      if (res.ok) fetchAssessments(); 
    } catch (err) {
      alert('❌ Network error during deletion.');
    }
  };

  if (loading) return <p>Loading assessments...</p>;

  return (
    <div className="my-assessments" style={{ width: '50%', margin: '2rem auto' }}>
      <h1>My Assessments</h1>
      {assessments.length === 0 ? (
        <p>You haven't created any assessments yet.</p>
      ) : (
        <div className="assessments-list">
          {assessments.map(a => (
            <div key={a._id} className="assessment-item">
              <div>
                <h3>{a.title}</h3>
                <p><strong>Subject:</strong> {a.subject}</p>
                <p><strong>Questions:</strong> {a.questions?.length || 0}</p>
                <p><strong>Created:</strong> {new Date(a.dateOfCreation).toLocaleDateString()}</p>
              </div>
              <div className="assessment-actions">
                <button 
                  onClick={() => reassignAssessment(a._id, a.title)}
                  className="btn-reassign"
                >
                  🔄 Re-assign to Students
                </button>
                <button 
                  onClick={() => removeAssessment(a._id, a.title)}
                  className="btn-remove"
                >
                  ❌ Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyAssessments;