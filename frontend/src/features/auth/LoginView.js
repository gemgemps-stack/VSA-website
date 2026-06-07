import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email.trim(), password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <section className="login-visual" aria-label="Verdida branding">
          <div className="login-brand">
            <img
              className="login-logo"
              src="/verdida-logo.png"
              alt="Verdida Sports Apparel logo"
            />
            <div className="brand-copy">
              <h1><i>Verdida Sports Apparel</i></h1>
              <p>
              Apparel and Clothing
            </p>
            </div>
          </div>

          <div className="brand-highlight">
            <h2>Style doesn&apos;t have to be expensive 💯</h2>
            <p>
              Manage inventory, orders, and customer accounts in one place.
            </p>
          </div>

          <ul className="brand-points">
            <li>Affordable apparel &amp; clothing</li>
            <li>High-quality customized jerseys</li>
            <li>Trusted brand experience</li>
          </ul>
        </section>

        <section className="login-panel">
          <div className="login-panel-inner">
          <div className="login-header">
              <h2>Welcome back!</h2>
              <p className="motto">Sign in to your VSA account with your email</p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {error && <div className="error-message">{error}</div>}

              <button
                type="submit"
                className="login-btn"
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Sign In'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Login;
