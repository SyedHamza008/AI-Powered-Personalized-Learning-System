import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom'; //  NEW IMPORT
import MaterialFileModal from './MaterialFileModal';
import '../../styles/MaterialCard.css';

const MaterialCard = ({ material }) => {
  const [timeSpent, setTimeSpent] = useState(0);
  const [sessionActive, setSessionActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const intervalRef = useRef(null);
  
  // NEW: Check if on learning materials page
  const location = useLocation();
  const isLearningMaterialsPage = location.pathname.includes('/materials');

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/materials/learning-history?material_id=${material._id}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        const data = await response.json();
        
        if (!isMounted) return;
        
        if (data.history?.length > 0) {
          const session = data.history[0];
          setTimeSpent(session.total_time_spent_in_seconds || 0);
          setSessionActive(false);
        } else {
          setTimeSpent(0);
          setSessionActive(false);
        }
      } catch (error) {
        console.error('❌ Error loading session:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
      //  Stop timer when component unmounts
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [material._id]);

  // Create session before opening material
  const openMaterial = async () => {
    try {
      
      if (isLearningMaterialsPage) {
        const sessionRes = await fetch('/api/materials/start-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ material_id: material._id }),
        });

        if (!sessionRes.ok) {
          throw new Error('Failed to start learning session');
        }
      }
      console.log('📦 Material data:', {
        files: material.files,
        filesLength: material.files?.length,
        contentUrl: material.contentUrl,
        hasUrl: !!material.contentUrl
      });
      // Open material
      const hasMultipleFiles = material.files?.length > 1;
      const hasSingleFile = material.files?.length === 1;
      const hasUrl = material.contentUrl;

      if (hasMultipleFiles) {
        setShowModal(true);
      } else if (hasSingleFile) {
        window.open(material.files[0].url, '_blank');
      } else if (hasUrl) {
        window.open(material.contentUrl, '_blank');
      } else {
        alert(`❌ This material has no content!
        
        Teacher needs to add:
        • Upload files, OR
        • Provide a content URL
                
        Material ID: ${material._id}`);
          return;
      }

      //  Start timer ONLY on learning materials page
      if (!intervalRef.current && isLearningMaterialsPage) {
        setSessionActive(true);
        startTimeTracking(material._id);
      }
    } catch (error) {
      console.error('❌ Error:', error);
      alert(error.message);
    }
  };

  const startTimeTracking = (materialId) => {
    let tickStart = Date.now();
    
    intervalRef.current = setInterval(async () => {
      const elapsed = Math.floor((Date.now() - tickStart) / 1000);
      tickStart = Date.now();
      
      try {
        const response = await fetch('/api/materials/track-time', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ 
            material_id: materialId, 
            time_spent: elapsed, 
            action: 'update' 
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('❌ Failed:', errorData);
          stopTracking();
          return;
        }
        
        setTimeSpent(prev => prev + elapsed);
      } catch (error) {
        console.error('❌ Network error:', error);
        stopTracking();
      }
    }, 30000);
  };

  const stopTracking = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setSessionActive(false);
    }
  };

  const refreshLearningHistory = async () => {
  try {
    const response = await fetch(
      `/api/materials/learning-history?material_id=${material._id}`,
      { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
    );
    const data = await response.json();
    
    if (data.history?.length > 0) {
      const session = data.history[0];
      setTimeSpent(session.total_time_spent_in_seconds || 0);
      setSessionActive(false); // Ensure session is marked inactive
    }
  } catch (error) {
    console.error('❌ Error refreshing history:', error);
  }
};

  const completeMaterial = async () => {
    stopTracking();
    
    try {
      await fetch('/api/materials/track-time', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ 
          material_id: material._id, 
          time_spent: 0, 
          action: 'complete' 
        }),
      });
      await refreshLearningHistory();
    } catch (error) {
      console.error('❌ Error:', error);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) return <div className="material-card loading">Loading...</div>;

  return (
    <>
      <div className="material-card">
        <div className="card-content" onClick={openMaterial}>
          <h3>{material.title}</h3>
          <p>{material.description}</p>
          <div className="meta">
            <span className="topics">{material.topics?.join(', ')}</span>
            <span className="type">{material.type}</span>
            <span className="difficulty">{material.difficulty}</span>
            <span className="content-url">{material.contentUrl ? `URL: ${material.contentUrl}` : 'No content URL'}</span>
            <span>Est. Time: {material.estimatedTime} min</span>
            {material.files?.length > 1 && (
              <span className="file-count">{material.files.length} files</span>
            )}
          </div>
        </div>       
        {isLearningMaterialsPage && (
          <div className="tracking-section">
            {sessionActive ? (
              <>
                <div className="timer">⏱️ Time spent: {formatTime(timeSpent)}</div>
                <button className="complete-btn" onClick={completeMaterial}>
                  Mark as Completed
                </button>
              </>
            ) : timeSpent > 0 ? (
              <div className="completion-status">✅ Completed in {formatTime(timeSpent)}</div>
            ) : null}
          </div>
        )}
        <hr />
        <p className='warning'> <span style={{fontWeight: 'bold', color: 'red'}}>NOTE! </span>Timer is active only on the learning materials page. Do NOT CLOSE IT or REDIRECT FROM IT!</p>
      </div>

      {showModal && material.files?.length > 1 && (
        <MaterialFileModal material={material} onClose={() => setShowModal(false)} />
      )}
    </>
  );
};

export default MaterialCard;