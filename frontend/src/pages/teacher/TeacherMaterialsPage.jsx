import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/TeacherMaterialsPage.css';

const TeacherMaterialsPage = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMaterials = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await fetch('/api/materials/teacher', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) throw new Error('Failed to fetch materials');
        
        const data = await response.json();
        setMaterials(data.materials);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMaterials();
  }, []);

  const handleCreateMaterial = () => navigate('/teacher/upload-material');
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleDelete = async (materialId) => {
    if (window.confirm('Are you sure you want to delete this material?')) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/materials/${materialId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Delete failed');
        
        // Refresh list
        setMaterials(materials.filter(m => m._id !== materialId));
      } catch (err) {
        setError(err.message);
      }
    }
  };

  if (loading) return <div className="loading">Loading materials...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="teacher-materials-container">
      <div className="header-section">
        <h1>My Teaching Materials</h1>
        <button onClick={handleCreateMaterial} className="create-button">
          + Create New Material
        </button>
      </div>
      
      {materials.length === 0 ? (
        <div className="no-materials">
          <p>You haven't created any materials yet.</p>
          <button onClick={handleCreateMaterial} className="create-button">
            Create Your First Material
          </button>
        </div>
      ) : (
        <div className="materials-grid">
          {materials.map(material => (
            <div key={material._id} className="material-card">
              <div className="card-header">
                <h3>{material.title}</h3>
                <span className={`status ${material.status}`}>
                  {material.status}
                </span>
              </div>
              
              <p className="description">{material.description}</p>
              
              <div className="meta-info">
                <span>Type: {material.type}</span>
                <span>Topics: {material.topics.join(', ')}</span>
                <span>Created: {formatDate(material.createdAt)}</span>
              </div>
              
              <div className="actions">
                <a 
                  href={material.contentUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="view-button"
                >
                  View
                </a>
                <button 
                  onClick={() => handleDelete(material._id)} 
                  className="delete-button"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherMaterialsPage;