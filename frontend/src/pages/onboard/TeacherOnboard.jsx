// TeacherOnboard.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api';
import './Onboard.css';

export default function TeacherOnboard() {
  const nav = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ name: '', department: '', education: '' });
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name) return alert('Name is required');
    setLoading(true);

    try {
      await api.post('/onboard/teacher', {
        name: form.name,
        department: form.department,
        education: form.education
      });

      const res = await api.post('/onboard/complete');
      login(res.data.dashboard_token);
      await new Promise(res => setTimeout(res, 500)); // Small delay
      nav('/teacher');
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      console.error('Teacher onboarding error:', errorMsg);

      if (errorMsg === 'Teacher profile already exists') {
        try {
          const res = await api.post('/onboard/complete');
          login(res.data.dashboard_token);
          nav('/teacher');
        } catch (tokenErr) {
          console.error('Failed to get completion token:', tokenErr);
          alert('Profile exists but failed to redirect. Please refresh.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboard">
      <form onSubmit={submit} className="onboard-form">
        <h2>Complete Teacher Profile</h2>
        <label>Name</label>
        <input name="name" value={form.name} onChange={handle} required />
        
        <label>Department</label>
        <input name="department" value={form.department} onChange={handle} placeholder="e.g. Mathematics" required />

        <label>Education</label>
        <input name="education" value={form.education} onChange={handle} placeholder="e.g. PhD in Mathematics" required />

        <button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
}