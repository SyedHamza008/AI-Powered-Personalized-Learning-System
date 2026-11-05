import React, { useEffect, useState } from 'react';
import AIInsightCard from '../../components/teacher/AIInsightCard';
import '../../styles/AIInsights.css';

const AIInsights = () => {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAIInsights();
  }, []);

  const fetchAIInsights = async () => {
    try {
      const res = await fetch('/api/ai/teacher-insights', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await res.json();
      setInsights(data.insights);
    } catch (err) {
      console.error('Failed to fetch AI insights:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p className="loading">Loading AI insights...</p>;

  return (
    <div className="ai-insights">
      <h1>🤖 AI Insights</h1>
      <p>AI-generated reports on student performance and recommendations.</p>

      {insights.length === 0 ? (
        <p>No insights available yet.</p>
      ) : (
        <div className="insights-container">
          <div className="insights-grid">
            {insights.map((insight, index) => (
              <AIInsightCard key={index} insight={insight} />
            ))}
          </div>
        </div>
      )}
        </div>
  );
};

export default AIInsights;