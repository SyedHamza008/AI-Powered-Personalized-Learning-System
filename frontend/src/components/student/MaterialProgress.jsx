import React, { useState, useEffect } from 'react';
import '../../styles/MaterialProgress.css';

const MaterialProgress = () => {
  const [progressData, setProgressData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const response = await fetch('/api/materials/learning-history?limit=10', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        
        const data = await response.json();
        console.log('API Response:', data); // Debug log
        
        if (data.success) {
          setProgressData(data.history);
        }
      } catch (error) {
        console.error('Error fetching progress:', error);
        setMessage('❌ Failed to load progress');
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, []);

  const handleContinue = async (materialId) => {
    try {
      const response = await fetch(`/api/materials/access/${materialId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();

      if (data.success && data.material?.files?.length > 0) {
        // Open the first file URL
        window.open(data.material.files[0].url, '_blank');
      } else {
        setMessage('❌ Unable to access material');
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage('❌ Error accessing material');
    }
  };

  if (loading) return <div className="loading">Loading progress...</div>;

  return (
    <div className="material-progress">
      <h3>Your Learning Progress</h3>
      {message && <p className={`message ${message.includes('✅') ? 'success' : 'error'}`}>{message}</p>}
      
      {progressData.length === 0 ? (
        <p>No learning activities tracked yet.</p>
      ) : (
        <ul className="progress-list">
          {progressData.map((session) => (
            <li key={session._id} className="progress-item">
              <div className="info">
                <h4>{session.material_title}</h4>
                <div className="session-meta">
                  <span className="topics">
                    {Array.isArray(session.material_topics) && session.material_topics.length > 0
                      ? session.material_topics.join(', ')
                      : 'No topics'}
                  </span>
                  <span className="date">
                    {session.start_time ? new Date(session.start_time).toLocaleDateString() : 'Date unknown'}
                  </span>
                </div>
              </div>
              <div className="status">
                {session.status === 'completed' ? (
                  <div className="completed">
                    <span>✅ Completed</span>
                    <span className="time">
                      {session.total_time_spent_in_seconds 
                        ? `${Math.floor(session.total_time_spent_in_seconds / 60)} min`
                        : '0 min'}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="in-progress">
                      In Progress
                    </div>
                    <button 
                      className="continue-btn"
                      onClick={() => handleContinue(session.material_id)}
                      disabled={!session.material_id}
                    >
                      Continue
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MaterialProgress;