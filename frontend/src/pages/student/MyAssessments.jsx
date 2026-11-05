import React, { useState, useEffect } from 'react';
import AssessmentCard from '../../components/student/AssessmentCard';
import '../../styles/StudentDashboard.css';

const MyAssessments = () => {
  const [assessments, setAssessments] = useState({ pending: [], completed: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAssessments = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const response = await fetch('/api/assessments/student', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch assessments');
        }

        const data = await response.json();
        setAssessments({
          pending: data.pending || [],
          completed: data.completed || [],
        });
      } catch (err) {
        console.error('Error fetching assessments:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAssessments();
  }, []);

  if (loading) {
    return <div className="loading">Loading your assessments...</div>;
  }

  if (error) {
    return <div className="error-message">⚠️ {error}</div>;
  }

  return (
    <div className="my-assessments">
      <h2>My Assessments</h2>

      {/* Pending Assessments */}
      <section className="assessment-section">
        <h3>Pending ({assessments.pending.length})</h3>
        {assessments.pending.length === 0 ? (
          <p className="no-data">No pending assessments at the moment.</p>
        ) : (
          <div className="assessment-grid">
            {assessments.pending.map((item) => (
              <AssessmentCard
                key={item._id}
                assessment={item}
                status="pending"
              />
            ))}
          </div>
        )}
      </section>

      {/* Completed Assessments */}
      <section className="assessment-section">
        <h3>Completed ({assessments.completed.length})</h3>
        {assessments.completed.length === 0 ? (
          <p className="no-data">You haven’t completed any assessments yet.</p>
        ) : (
          <div className="assessment-grid">
            {assessments.completed.map((item) => (
              <AssessmentCard
                key={item._id}
                assessment={item}
                status="completed"
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default MyAssessments;