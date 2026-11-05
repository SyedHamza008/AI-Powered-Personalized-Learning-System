import { useNavigate, Link } from 'react-router-dom';
import './Landing.css';

export default function Landing() {
  const nav = useNavigate();

  return (
    <div className="landing">
      {/* ---------- HERO ---------- */}
      <header className="hero">
        <div className="hero-text">
          <h1>AI-Powered Personalized Learning System</h1>
          <p>Personalized learning for students.</p>
          <p className="sub">
            Improve your learning experience with customized content and
            AI-driven recommendations.
          </p>

          <div className="cta-group">
            <button className="btn primary" onClick={() => nav('/login')}>
              Log In
            </button>
            <button className="btn secondary" onClick={() => nav('/register')}>
              Sign Up
            </button>
          </div>

          <div className="role-pills">
            <Link to="/login"><span >Student</span></Link>
            <Link to="/login"><span >Teacher</span></Link>
            <Link to="/login"><span >Administrator</span></Link>
          </div>
        </div>

        <div className="hero-image">
          <img src="https://easy-peasy.ai/cdn-cgi/image/quality=95,format=auto,width=800/https://media.easy-peasy.ai/27feb2bb-aeb4-4a83-9fb6-8f3f2a15885e/863aa6d7-f8c8-4be1-91d3-c494baadb77e.png" alt="AI Learning" />
        </div>
      </header>

      {/* ---------- FOOTER ---------- */}
      <footer>
        <p>@2025 AI-Powered Personalized Learning System</p>
      </footer>
    </div>
  );
}