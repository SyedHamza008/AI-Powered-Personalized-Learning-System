import React from 'react';
import '../../styles/MaterialFileModal.css';

const MaterialFileModal = ({ material, onClose }) => {
  const handleFileOpen = (file) => {
    window.open(file.url, '_blank');
    setTimeout(() => onClose(), 500);
  };

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    const iconMap = {
      pdf: '📄', mp4: '🎬', doc: '📝', docx: '📝',
      ppt: '📊', pptx: '📊', txt: '📃',
      jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️'
    };
    return iconMap[ext] || '📎';
  };

  return (
    <div className="file-modal-overlay" onClick={onClose}>
      <div className="file-modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{material.title}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <p className="modal-description">{material.description}</p>
        
        <div className="file-list">
          {material.files.map((file, idx) => (
            <div key={idx} className="file-item" onClick={() => handleFileOpen(file)}>
              <span className="file-icon">{getFileIcon(file.filename)}</span>
              <div className="file-info">
                <span className="file-name">{file.filename}</span>
                <span className="file-meta">
                  {file.type} • {Math.round(file.size / 1024)} KB
                </span>
              </div>
              <span className="open-icon">➡️</span>
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <button className="close-btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default MaterialFileModal;