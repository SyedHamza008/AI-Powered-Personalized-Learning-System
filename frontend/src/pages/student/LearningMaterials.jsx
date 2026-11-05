import React, { useEffect, useState } from 'react';
import MaterialCard from '../../components/student/MaterialCard';
import '../../styles/LearningMaterials.css';

const LearningMaterials = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const res = await fetch('/api/materials/student', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await res.json();
      setMaterials(data.materials);
    } catch (err) {
      console.error('Failed to fetch materials:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p className="loading">Loading materials...</p>;

  return (
    <div className="learning-materials">
      <h1>📚 Learning Materials</h1>
      {materials.length === 0 ? (
        <p>No materials available yet. Check back soon!</p>
      ) : (
        <div className="materials-grid">
          {materials.map((material) => (
            <MaterialCard key={material._id} material={material} />
          ))}
        </div>
      )}
    </div>
  );
};

export default LearningMaterials;