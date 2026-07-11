import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import PageContainer from '../components/PageContainer';
import './AuthPage.css';

export default function Register() {
  const navigate = useNavigate();
  const { register, error: authError } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username || !email || !password || !passwordConfirm) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== passwordConfirm) { // making sure they didn't typo the password, happens to me all the time
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) { // 8 characters or else backend is gonna scream at us
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true); // disable button and show loading so user doesn't spam registration
    const result = await register(username, email, password, passwordConfirm); // signs up and logs in instantly, gets a fresh 7-day token
    if (result.success) {
      navigate('/');
    } else {
      setError(result.error || 'Registration failed'); // handles registration failure (e.g. username taken)
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
            <h1 className="auth-title">Create Account</h1>
            <p className="auth-subtitle">Join to unlock premium features</p> {/* we dont have any premium featires */}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="auth-error">{error}</div>}
            {authError && <div className="auth-error">{authError}</div>}

            <div className="form-group">
              <label htmlFor="username" className="form-label">
                Username
              </label>
              <input
                id="username" 
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="john_doe"
                className="form-input"
                disabled={isLoading}
              />
            </div>

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
              <p className="form-help">At least 8 characters</p> {/* honestly who in the world is not using 8 chars as passwprd*/}
            </div>

            <div className="form-group">
              <label htmlFor="passwordConfirm" className="form-label">
                Confirm Password
              </label>
              <input
                id="passwordConfirm"
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)} /* sometimes the user might be drunk, hence the confirmation */
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
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Footer */}
          <div className="auth-footer">
            <p className="auth-footer-text">
              Already have an account?{' '}
              <Link to="/signin" className="auth-link">
                Sign in
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
