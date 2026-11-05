import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from "../../api";
import './Onboard.css';

export default function StudentOnboard() {
  const nav = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ name: '', learningLevel: '' });
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

 const submit = async (e) => {
    e.preventDefault();
     if (!form.name || !form.learningLevel) {
       alert('Please fill in all fields');
      return;
     }
     setLoading(true);

     try {
       await api.post('/onboard/student', { name: form.name, learningLevel: form.learningLevel });
       const completedRes = await api.post('/onboard/complete');
        const { dashboard_token } = completedRes.data;
        login(dashboard_token);

        await new Promise(res => setTimeout(res, 500)); // Small delay
        // Redirect to student dashboard
        nav('/student');
      } catch (err) {
        console.error("real error", err);
        const errorMsg = err.response?.data?.error || err.message;
        console.error('Onboarding error:', errorMsg);
        alert(`Onboarding failed: ${errorMsg}`);
        
        if (errorMsg === 'Student profile already exists') {
          // Get new onboarded token and redirect
          try {
            const completedRes = await api.post('/onboard/complete');
            const { dashboard_token } = completedRes.data;
            login(dashboard_token);
            nav('/student');
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
        <h2>Finish Student Profile</h2>
        <label>Name</label>
        <input name="name" value={form.name} onChange={handle} required />
        <label>Learning Level</label>
        <select name="learningLevel" value={form.learningLevel} onChange={handle} required>
          <option value="">Select</option>
          <option>Metric</option>
          <option>Intermediate</option>
          <option>Bachelor</option>
          <option>Master</option>
        </select>
        <button type="submit">Save</button>
        {loading ? 'Saving...' : 'Save Profile'}
      </form>
    </div>
  );
}