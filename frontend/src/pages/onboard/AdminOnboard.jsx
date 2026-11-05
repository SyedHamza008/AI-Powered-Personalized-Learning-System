import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from "../../api";
import './Onboard.css';

export default function AdminOnboard() {
  const nav = useNavigate();
  const {login} = useAuth();

  const [form, setForm] = useState({ name: '' });
  const [loading, setLoading] = useState(false);
  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      console.log('Token being sent:', localStorage.getItem('token'));
      const res = await api.post('/onboard/admin', { name: form.name });

      const completedRes = await api.post('/onboard/complete');
    const { dashboard_token } = completedRes.data;
    login(dashboard_token);
      // Redirect to admin dashboard
      nav('/admin');
    } catch (err) {
    const errorMsg = err.response?.data?.error || err.message;
    console.error('Onboarding error:', errorMsg);
    // SPECIAL HANDLING: If profile exists, redirect anyway!
    if (errorMsg === 'Admin profile already exists') {
      // Get new onboarded token and redirect
      try {
        const completedRes = await api.post('/onboard/complete');
        const { dashboard_token } = completedRes.data;
        login(dashboard_token);
        nav('/admin');
      } catch (tokenErr) {
        console.error('Failed to get completion token:', tokenErr);
        alert('Profile exists but failed to redirect. Please refresh.');
      }
    } else {
      alert(`Onboarding failed: ${errorMsg}`);
    }
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="onboard">
      <form onSubmit={submit} className="onboard-form">
        <h2>Finish Admin Profile</h2>
        <label>Name</label>
        <input name="name" value={form.name} onChange={handle} required />
        <button type="submit" disabled={loading}>Save</button>
        {loading ? 'Saving...' : 'Save Profile'}
      </form>
    </div>
  );
}