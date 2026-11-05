import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PasswordField from '../components/PasswordField.jsx';
import './Register.css';

export default function Register() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'student',
    grade: '',
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      alert('Account created! Please log in.');
      nav('/login');
    } else {
      alert('Registration failed');
    }
  };

  return (
    <div className="register">
      <form onSubmit={handleSubmit} className="register-form">
        <h2>Create Account</h2>

        <label>UserName</label>
        <input name="username" value={form.username} onChange={handleChange} required />

        <label>Email</label>
        <input type="email" name="email" value={form.email} onChange={handleChange} required />

        <label>Password</label>
        <PasswordField name="password" value={form.password} placeholder="Create a password" onChange={handleChange} required />

        <label>Role</label>
        <select name="role" value={form.role} onChange={handleChange}>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="admin">Admin</option>
        </select>

        <button type="submit">Sign Up</button>
        <p>
          Already have an account?{' '}
          <span className="link" onClick={() => nav('/login')}>
            Log in
          </span>
        </p>
      </form>
    </div>
  );
}