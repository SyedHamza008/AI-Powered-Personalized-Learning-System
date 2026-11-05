import React, { useEffect, useState } from 'react';
import RecommendationCard from '../../components/student/RecommendationCard';
import QuizModal from '../../components/student/QuizModal';
import '../../styles/AIRecommendations.css';

const AIRecommendations = () => {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

  const [quizData, setQuizData] = useState(null);
  const [showQuiz, setShowQuiz] = useState(false);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      console.log('Starting API call...');
      const res = await fetch('/api/ai/recommendations', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      const contentType = res.headers.get('content-type');
      
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error(`Server returned ${res.status}: ${text.substring(0, 100)}`);
      }
      if (!res.ok) {
        throw new Error('Failed to fetch recommendations');
      }
      
      const data = await res.json();
      
      if (data.recommendations) {
        setDebugInfo({
          hasRecommendedMaterials: !!data.recommendations.recommendedMaterials,
          materialsCount: data.recommendations.recommendedMaterials?.length || 0,
          firstMaterial: data.recommendations.recommendedMaterials?.[0] || null
        });
      }
      
      if (data.success) {
        setRecommendations(data.recommendations);
      } else {
        throw new Error(data.error || 'Failed to load recommendations');
      }
    } catch (err) {
      console.error('Failed to fetch AI recommendations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQuiz = async (topic, difficulty = 'beginner') => {
    try {
      const res = await fetch('/api/ai/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ topic, difficulty }),
      });
      
      const data = await res.json();
      
      if (data.quiz) {
        setQuizData(data.quiz); // Store the quiz data
        setShowQuiz(true);      // Open the modal
      }
    } catch (err) {
      console.error('Failed to generate quiz:', err);
      alert("Failed to generate quiz. Please try again.");
    }
  };

  const handleMaterialClick = (material) => {
    if (material.files && material.files.length > 0) {
      if (material.files.length === 1) {
        window.open(material.files[0].url, '_blank');
      } else {
        alert(`This material has ${material.files.length} files. Please select one to view.`);
      }
    } else if (material.contentUrl) {
      window.open(material.contentUrl, '_blank');
    } else {
      alert('No content available for this material');
    }
  };

  if (loading) return <div className="loading">Loading AI recommendations...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!recommendations) return <p>No recommendations available.</p>;

  return (
    <div className="ai-recommendations">
      
      <div className="recommendations-header">
        <h1>🤖 AI-Powered Learning Recommendations</h1>
        <p>Personalized study plan based on your performance analysis</p>
      </div>

      {/* General Advice */}
      {recommendations.generalAdvice && (
        <section className="general-advice">
          <h2>💡 AI Study Advice</h2>
          <div className="advice-card">
            <p>{recommendations.generalAdvice}</p>
          </div>
        </section>
      )}

      {/* Priority Areas */}
      <section className="priority-areas">
        <h2>🚨 Priority Focus Areas</h2>
        <div className="priority-cards">
          {recommendations.priorityAreas?.map((area, idx) => (
            <div key={idx} className={`priority-card ${area.confidence.toLowerCase()}`}>
              <h4>{area.topic}</h4>
              <p>{area.reason}</p>
              <span className={`confidence-badge ${area.confidence.toLowerCase()}`}>
                {area.confidence} Priority
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Study Plan */}
      <section className="study-plan">
        <h2>📅 Recommended Study Plan</h2>
        <div className="plan-timeline">
          {recommendations.studyPlan?.map((item, idx) => (
            <div key={idx} className="plan-item">
              <div className="timeline-marker">{idx + 1}</div>
              <div className="plan-content">
                <h4>{item.day}</h4>
                <p className="focus">{item.focus}</p>
                <div className="activities">
                  {item.activities?.map((activity, activityIdx) => (
                    <span key={activityIdx} className="activity-tag">#{activity}</span>
                  ))}
                </div>
                <div className="plan-meta">
                  <span className="time">⏱️ {item.estimatedTime} min</span>
                  {item.materials?.length > 0 && (
                    <span className="materials">📚 {item.materials.length} materials</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recommended Materials */}
      <section className="materials">
        <h2>📚 Recommended Learning Materials</h2>
        {recommendations.recommendedMaterials && recommendations.recommendedMaterials.length > 0 ? (
          <div className="material-cards">
            {recommendations.recommendedMaterials.map((material, idx) => (
              <div key={material._id || idx} className="material-card" onClick={() => handleMaterialClick(material)}>
                <h4>{material.title}</h4>
                <p>{material.reason || material.description}</p>
                <div className="material-meta">
                  <span className="type">{material.type}</span>
                  <span className="difficulty">{material.difficulty}</span>
                  {material.estimatedTime && <span className="time">{material.estimatedTime} min</span>}
                </div>
                {material.topics && (
                  <div className="topics">
                    {material.topics.map((topic, topicIdx) => (
                      <span key={topicIdx} className="topic-tag">{topic}</span>
                    ))}
                  </div>
                )}
                {material.files && (
                  <div className="file-count">
                    {material.files.length} file{material.files.length > 1 ? 's' : ''} available
                  </div>
                )}
                {material.contentUrl && (
                  <div className="content-indicator">
                    External content available
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="no-materials">
            <p>No specific learning materials recommended at this time.</p>
            <p>Check back later after completing more assessments.</p>
          </div>
        )}
      </section>

      {/* Practice Quizzes */}
      <section className="quizzes">
        <div className="quizzes-header">
          <h2>🎯 Practice Quizzes</h2>
          <p>Generated based on your weaker areas</p>
        </div>
        <div className="quiz-cards">
          {recommendations.practiceQuizzes?.map((quiz, idx) => (
            <div key={idx} className="quiz-card">
              <div className="quiz-info">
                <h4>{quiz.topic}</h4>
                <p>Focus: {quiz.focusAreas?.join(', ')}</p>
                <div className="quiz-meta">
                  <span className="difficulty">Level: {quiz.difficulty}</span>
                  <span className="time">Time: {quiz.estimatedTime} min</span>
                </div>
              </div>
              <button 
                className="generate-quiz-btn"
                onClick={() => handleGenerateQuiz(quiz.topic, quiz.difficulty)}
              >
                Start Quiz
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Refresh Button */}
      <div className="refresh-section">
        <button onClick={fetchRecommendations} className="refresh-btn">
          🔄 Refresh Recommendations
        </button>
      </div>

      {showQuiz && (
        <QuizModal 
          quizData={quizData} 
          onClose={() => setShowQuiz(false)} 
        />
      )}

    </div>
  );
};

export default AIRecommendations;