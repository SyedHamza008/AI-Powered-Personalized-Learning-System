import React, { useEffect, useState } from 'react';
import StudentProgressCard from '../../components/teacher/StudentProgressCard';
import { useAuth } from '../../contexts/AuthContext';
import { Bar, Line } from 'react-chartjs-2';
import '../../styles/StudentProgress.css';


import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

const StudentProgress = () => {
  const { currentUser } = useAuth();
  const [students, setStudents] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser?.id) return;

      try {
        const token = localStorage.getItem('token');

        // Fetch students
        const studentsRes = await fetch('/api/assessments/teacher/students-progress', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const studentsData = await studentsRes.json();

        // Fetch analytics
        const analyticsRes = await fetch('/api/assessments/teacher/analytics', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const analyticsData = await analyticsRes.json();

        setStudents(studentsData.students || []);
        setAnalytics(analyticsData);
      } catch (err) {
        console.error('Error fetching ', err);
        setError('Failed to load student progress data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser?.id]);

  if (loading) return <p>Loading student progress...</p>;
  if (error) return <p className="error">{error}</p>;

  // Prepare chart data
const avgScoreData = {
  labels: analytics?.avgScoresPerAssessment?.map(a => a.title) || [],
  datasets: [
    {
      label: 'Average Score (%)',
      data: analytics?.avgScoresPerAssessment?.map(a => a.avgScore) || [],
      backgroundColor: 'rgba(54, 162, 235, 0.6)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1,
    },
  ],
};

const avgScoreOptions = {
  responsive: true,
  plugins: {
    legend: { position: 'top' },
    tooltip: {
      callbacks: {
        label: function(context) {
          return `${context.label}: ${context.raw}%`;
        }
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      max: 100,
      title: { display: true, text: 'Score (%)' }
    },
    x: {
      title: { display: true, text: 'Assessment' }
    }
  }
};

  // For Performance Trend
const trendData = {
  labels: analytics?.performanceTrend?.map(t => t.date) || [],
  datasets: [
    {
      label: 'Class Avg Score (%)',
      data: analytics?.performanceTrend?.map(t => t.avgScore) || [],
      borderColor: 'rgb(75, 192, 192)',
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      tension: 0.1,
      fill: true,
    },
  ],
};

const trendOptions = {
  responsive: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: function(context) {
          return `Avg: ${context.raw}%`;
        }
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      max: 100,
      title: { display: true, text: 'Score (%)' }
    },
    x: {
      title: { display: true, text: 'Date' }
    }
  }
};

  return (
    <div className="student-progress-page">
      <h2>Student Progress Overview</h2>

      {/* Analytics Section */}
      {analytics && (
        <div className="analytics-section">
          <h3>📊 Class Analytics</h3>

          {/* Average Score per Assessment */}
          <div className="chart-container">
            <h4>Average Score per Assessment</h4>
            <Bar data={avgScoreData} options={avgScoreOptions} />
          </div>

          {/* Performance Trend */}
          <div className="chart-container">
            <h4>Class Performance Trend</h4>
            <Line data={trendData} options={trendOptions} />
            <p><span style={{fontSize: '0.9em', color: '#684848ff'}}
            >It Shows Performance Trend(data) for the last 2 months.</span></p>
          </div>

          {/* Most Missed Questions */}
          <div className="missed-questions">
            <h4>Most Missed Questions</h4>
            {analytics.mostMissedQuestions && analytics.mostMissedQuestions.length > 0 ? (
              <ul>
                {analytics.mostMissedQuestions.map((q, idx) => (
                  <li key={idx}>
                    <strong>Assessment:</strong> {q.assessmentTitle} | 
                    <strong> Question:</strong> {q.questionText} | 
                    <strong> Missed by:</strong> {q.missCount} students
                  </li>
                ))}
              </ul>
            ) : (
              <p>No missed questions data available.</p>
            )}
          </div>
        </div>
      )}

      {/* Student Cards */}
      <h3>Individual Students</h3>
      <div className="students-grid">
        {students.map((student) => (
          <StudentProgressCard key={student._id} student={student} />
        ))}
      </div>
    </div>
  );
};

export default StudentProgress;