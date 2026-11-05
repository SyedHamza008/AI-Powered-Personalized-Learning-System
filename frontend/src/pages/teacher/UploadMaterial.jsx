import React, { useState, useEffect } from 'react';
import '../../styles/UploadMaterial.css';

const UploadMaterial = () => {
  const [form, setForm] = useState({
    title: '',
    description: '',
    topics: '',
    type: 'collection',
    difficulty: 'medium',
    estimatedTime: 30,
    contentUrl: '',
    class_id: '', 
  });
  
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [fileUploading, setFileUploading] = useState(false);
  const [teacherClasses, setTeacherClasses] = useState([]); 
  
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('No token found! User might not be logged in.');
    setMessage('❌ Please log in first');
    return;
  }
  // Fetch teacher's classes on component mount
  useEffect(() => {
    fetchTeacherClasses();
  }, []);

  const fetchTeacherClasses = async () => {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/assessments/teacher-classes', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    console.log('DEBUG: Raw API response:', data);
    if (data.success) {
      console.log('Classes received:', data.classes);
      setTeacherClasses(data.classes || []);
    } else {
      console.error('API error:', data.error);
      setTeacherClasses([]);
    }
  } catch (err) {
    console.error('Failed to fetch classes:', err);
    setTeacherClasses([]);
  }
};

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Validate each file
    const largeFiles = files.filter(f => f.size > 100 * 1024 * 1024);
    if (largeFiles.length > 0) {
      setMessage(`❌ Files too large: ${largeFiles.map(f => f.name).join(', ')}. Max: 100MB each`);
      return;
    }
    
    setSelectedFiles(files);
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    setMessage('');
    console.log('DEBUG: Form data before submission:', {
    class_id: form.class_id,
    class_id_type: typeof form.class_id,
    all_form_data: form
  });
    try {
      // VALIDATION
      if (selectedFiles.length === 0 && !form.contentUrl?.trim()) {
        setMessage('❌ Please upload files OR provide a content URL');
        setUploading(false);
        return;
      }

      if (!form.title || !form.description || !form.topics || !form.class_id) {
        setMessage('❌ Please fill all required fields including class selection');
        setUploading(false);
        return;
      }

      let uploadedFilesData = [];

      // Upload files if selected
      if (selectedFiles.length > 0) {
        setFileUploading(true);
        const formData = new FormData();
        selectedFiles.forEach(file => formData.append('files', file));

        const uploadRes = await fetch('/api/materials/upload-multiple', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: formData,
        });

        const uploadData = await uploadRes.json();
        
        if (!uploadData.success && uploadData.errors?.length > 0) {
          throw new Error(`Upload failed: ${uploadData.errors.join(', ')}`);
        }
        
        uploadedFilesData = uploadData.files || [];
        setFileUploading(false);
      }

      // Prepare material payload
      const topicsArray = form.topics.split(',').map(t => t.trim()).filter(t => t);
      
      const payload = {
        ...form,
        topics: topicsArray,
      };

      if (uploadedFilesData.length > 0) {
        payload.files = uploadedFilesData.map(f => ({
          filename: f.filename,
          url: f.url,
          type: f.type
        }));
        delete payload.contentUrl;
      } else if (form.contentUrl?.trim()) {
        payload.contentUrl = form.contentUrl.trim();
      }

      // Create material
      const res = await fetch('/api/materials/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      
      if (data.success) {
        setMessage(`✅ Material created successfully with ${uploadedFilesData.length || '1'} item(s)!`);
        // Reset form
        setForm({
          title: '',
          description: '',
          subject: '',
          topics: '',
          type: 'collection',
          difficulty: 'medium',
          estimatedTime: 30,
          contentUrl: '',
          class_id: '',
        });
        setSelectedFiles([]);
      } else {
        setMessage('❌ Failed: ' + data.error);
      }
    } catch (err) {
      setMessage('❌ Error: ' + err.message);
    } finally {
      setUploading(false);
      setFileUploading(false);
    }
  };

  // Remove a selected file
  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="upload-material">
      <h1>Upload Learning Material</h1>
      {message && <p className={`message ${message.includes('✅') ? 'success' : 'error'}`}>{message}</p>}
      
      <form onSubmit={handleSubmit} className="upload-form">
        <label>Title *</label>
        <input
          name="title"
          value={form.title}
          onChange={handleChange}
          required
          placeholder="e.g., Thermodynamics Collection"
        />

        <label>Description *</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          required
          rows="4"
          placeholder="Describe the learning material..."
        />

        <label>Subject *</label>
        <input
          name="subject"
          value={form.subject}
          onChange={handleChange}
          required
          placeholder="e.g., Physics"
        />

        {/* NEW: Class Selection */}
        <select 
          name="class_id" 
          value={form.class_id} 
          onChange={handleChange}
          required
        >
          <option value="">Select a class</option>
          {teacherClasses.length === 0 ? (
            <option value="" disabled>No classes found</option>
          ) : (
            teacherClasses.map(cls => (
              // Use _id (not ClassId) for key - it's guaranteed to exist
              <option key={cls._id} value={cls._id}>
                {cls.title} - {cls.subject}
              </option>
            ))
          )}
        </select>

        <label>Topics (comma-separated) *</label>
        <input
          name="topics"
          value={form.topics}
          onChange={handleChange}
          required
          placeholder="e.g., physics, thermodynamics, energy"
        />

        <label>Type *</label>
        <select name="type" value={form.type} onChange={handleChange}>
          <option value="collection">Collection (Multiple Files)</option>
          <option value="pdf">PDF</option>
          <option value="video">Video</option>
          <option value="document">Document</option>
          <option value="interactive">Interactive</option>
          <option value="presentation">Presentation</option>
        </select>

        <label>Difficulty *</label>
        <select name="difficulty" value={form.difficulty} onChange={handleChange}>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        <label>Estimated Time (minutes) *</label>
        <input
          type="number"
          name="estimatedTime"
          value={form.estimatedTime}
          onChange={handleChange}
          min="5"
          max="180"
          required
        />

        <div className="material-source-section">
          <h3>Material Source (Choose at least one):</h3>
          
          <div className="source-option">
            <label>Upload Files (Multiple)</label>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              accept=".pdf,.mp4,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif"
              disabled={form.contentUrl.trim() !== ''}
            />
            
            {/* Show selected files */}
            {selectedFiles.length > 0 && (
              <div className="file-preview">
                <p><strong>{selectedFiles.length} files selected:</strong></p>
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="file-preview-item">
                    <span>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                    <button type="button" onClick={() => removeFile(idx)}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="divider">OR</div>

          <div className="source-option">
            <label>Content URL (YouTube, external PDF, etc.)</label>
            <input
              name="contentUrl"
              type="url"
              value={form.contentUrl}
              onChange={handleChange}
              placeholder="https://example.com/material.pdf"
              disabled={selectedFiles.length > 0}
            />
          </div>
        </div>

        <button type="submit" disabled={uploading || fileUploading}>
          {uploading || fileUploading ? '⏳ Processing...' : '📤 Upload Material'}
        </button>
      </form>
    </div>
  );
};

export default UploadMaterial;