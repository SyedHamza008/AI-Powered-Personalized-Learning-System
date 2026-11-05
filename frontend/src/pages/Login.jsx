import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import PasswordField from '../components/PasswordField';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student'); // Default role
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [btnText, setBtnText] = useState('Log In');

  const { login, currentUser, onboarded } = useAuth();
  const navigate = useNavigate();

  // Redirect immediately if already logged in
  useEffect(() => {
    if (currentUser) {
      console.log('User already logged in, redirecting...');
      if (onboarded) {
        navigate(`/${currentUser.role}`);
      } else {
        navigate(`/onboard/${currentUser.role}`);
      }
    }
  }, [currentUser, onboarded, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setBtnText('Logging in...');

    try {
      const res = await api.post('/auth/login', {
        username,
        email,
        password,
        role,
      });

      const { access_token } = res.data;

      // AuthContext will decode + set state + localStorage
      login(access_token);
      console.log('Login successful, token saved');
      // Navigation is handled automatically by the effect above
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || 'Login failed');

      // reset fields
      setUsername('');
      setEmail('');
      setPassword('');

      setTimeout(() => {
        setLoading(false);
        setBtnText('Log In');
        setError('');
      }, 2500);
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>AI Learning Platform - Login</h2>

        {error && <p className="error-message">{error}</p>}

        <label>UserName</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label>Password</label>
        <PasswordField
          name="password"
          value={password}
          placeholder="Enter your password"
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {btnText}
        </button>
      </form>
    </div>
  );
};

export default Login;