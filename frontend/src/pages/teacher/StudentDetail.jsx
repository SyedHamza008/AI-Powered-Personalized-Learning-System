import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/StudentDetail.css';

const StudentDetail = () => {
  const { studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchStudent = async () => {
      if (!currentUser?.id) return;

      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/assessments/teacher/student/${studentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (res.ok) {
          setStudent(data.student);
        } else {
          setError(data.error || 'Failed to load student details');
        }
      } catch (err) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, [studentId, currentUser?.id]);

  if (loading) return <p>Loading student details...</p>;
  if (error) return <p className="error">{error}</p>;

  // Sort evaluations by createdAt (most recent first)
  const sortedEvaluations = [...(student.progress?.evaluations || [])].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  return (
    <div className="student-detail-page">
      <h2>{student.profile.fullName}'s Progress</h2>

      <div className="student-info">
        <p><strong>School Grade:</strong> {student.profile.grade || "N/A"}</p>
        <p><strong>Latest Assessment Grade:</strong> {student.progress.latestGrade || "N/A"}</p>
        <p><strong>Subjects:</strong> {student.profile.subjects.join(', ')}</p>
      </div>

      <div className="stats">
        <p><strong>Avg Score:</strong> {student.progress.averageScore.toFixed(2)}%</p>
        <p><strong>Materials Completed:</strong> {student.progress.completedMaterials.length}</p>
        <p><strong>Assessments Attempted:</strong> {student.progress.attemptedAssessments.length}</p>
      </div>

      <div className="weak-areas">
        <strong>Weak Areas:</strong>
        {student.progress.weakAreas.length ? (
          <ul>
            {student.progress.weakAreas.map((area, idx) => (
              <li key={idx}>{area.topic}</li>
            ))}
          </ul>
        ) : (
          <p>None identified yet.</p>
        )}
      </div>

      {/* Assessment History Table */}
      <div className="assessment-history">
        <h3>📌 Assessment History</h3>
        {sortedEvaluations.length > 0 ? (
          <table className="assessment-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Assessment ID</th>
                <th>Subject</th>
                <th>Score</th>
                <th>Grade</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedEvaluations.map((ev, idx) => (
                <tr key={idx}>
                  <td>{new Date(ev.createdAt).toLocaleDateString()}</td>
                  <td>{ev.assessmentId}</td>
                  <td>{ev.subject_name || "N/A"}</td>
                  <td>{ev.score}%</td>
                  <td>{ev.grade || "—"}</td>
                  <td>{ev.result || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No assessment history available.</p>
        )}
      </div>

      <button onClick={() => navigate(-1)} className="back-btn">
        ← Back to Student Progress
      </button>
    </div>
  );
};

export default StudentDetail;