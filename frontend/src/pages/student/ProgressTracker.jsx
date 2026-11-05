import React, { useEffect, useState } from 'react';
import ProgressChart from '../../components/student/ProgressChart';
import MaterialProgress from '../../components/student/MaterialProgress';
import '../../styles/ProgressTracker.css';

const ProgressTracker = () => {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      const res = await fetch('/api/progress/student', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await res.json();
      setProgress(data);
    } catch (err) {
      console.error('Failed to fetch progress:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p className="loading">Loading progress...</p>;
  if (!progress) return <p>No progress data available.</p>;

  return (
    <div className="progress-tracker">
      <h1 style={{color: '#FDFFC5'}}>📊 Your Progress</h1>

      <section className="chart-section" style={{ color: '#50FF64' }}>
        <h2>Assessment Scores Over Time</h2>
        <ProgressChart scores={progress.scores} />
      </section>

      <section className="materials-section"  style={{ color: '#FF6E6E' }}>
        <h2>Learning Materials Completion</h2>
        <MaterialProgress materials={progress.materials} />
      </section>

      <section className="summary-section" style={{ color: '#FF6E6E' }}>
        <h2>Summary</h2>
        <div className="summary-cards">
          <div className="summary-card">
            <h3>{progress.totalAssessments}</h3>
            <p>Assessments Taken</p>
          </div>
          <div className="summary-card">
            <h3>{progress.averageScore}%</h3>
            <p>Average Score</p>
          </div>
          <div className="summary-card">
            <h3>{progress.completedMaterials}</h3>
            <p>Materials Completed</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ProgressTracker;