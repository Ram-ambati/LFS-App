import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import PageContainer from '../components/PageContainer';
import './AuthPage.css';

export default function SignIn() {
  const navigate = useNavigate();
  const { login, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email || !password) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    const result = await login(email, password);
    if (result.success) {
      navigate('/');
    } else {
      setError(result.error || 'Sign in failed');
    }
    setIsLoading(false);
  };

  return (
    <PageContainer>
      <div className="auth-page">
        <div className="auth-card">
          {/* Header */}
          <div className="auth-header">
            <div className="auth-logo">LFS</div>
            <h1 className="auth-title">Welcome Back</h1>
            <p className="auth-subtitle">Sign in to your account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="auth-error">{error}</div>}
            {authError && <div className="auth-error">{authError}</div>}

            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="form-input"
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="form-input"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="auth-button"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Footer */}
          <div className="auth-footer">
            <p className="auth-footer-text">
              Don't have an account?{' '}
              <Link to="/register" className="auth-link">
                Create one
              </Link>
            </p>
            <Link to="/" className="auth-link-secondary">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
