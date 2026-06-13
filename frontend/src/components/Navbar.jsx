import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './Navbar.css';

export default function Navbar() {
  const navigate = useNavigate();
  const { type, user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setIsMenuOpen(false);
    navigate('/');
  };

  const handleSignIn = () => {
    navigate('/signin');
  };

  return (
    <nav className="navbar">
      <div className="navbar__container">
        {/* Brand */}
        <div
          className="navbar__brand"
          onClick={() => navigate('/')}
          style={{ cursor: 'pointer' }}
        >
          <div className="navbar__logo">LFS</div>
          <div className="navbar__title">Secure Share</div>
        </div>

        {/* Right Side - Auth Status */}
        <div className="navbar__right">
          {type === 'loading' && (
            <div className="navbar__loading">Loading...</div>
          )}

          {type === 'guest' && (
            <div className="navbar__guest">
              <div className="navbar__guest-badge">👤 Guest</div>
              <button
                className="navbar__action-btn navbar__action-btn--primary"
                onClick={handleSignIn}
              >
                Sign In
              </button>
            </div>
          )}

          {type === 'signed-in' && user && (
            <div className="navbar__account">
              <div className="navbar__user-info">
                <span className="navbar__username">{user.username || user.email}</span>
              </div>
              <button
                className="navbar__menu-toggle"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-expanded={isMenuOpen}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="navbar__menu-icon"
                >
                  <circle cx="12" cy="12" r="2"></circle>
                  <circle cx="12" cy="5" r="2"></circle>
                  <circle cx="12" cy="19" r="2"></circle>
                </svg>
              </button>

              {/* Account Menu */}
              {isMenuOpen && (
                <div className="navbar__menu">
                  <div className="navbar__menu-header">
                    <div className="navbar__menu-avatar">
                      {(user.username || user.email || 'U')[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="navbar__menu-name">
                        {user.username || 'User'}
                      </div>
                      <div className="navbar__menu-email">{user.email}</div>
                    </div>
                  </div>

                  <div className="navbar__menu-divider"></div>

                  <button
                    className="navbar__menu-item"
                    onClick={() => {
                      navigate('/');
                      setIsMenuOpen(false);
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                      <polyline points="9 22 9 12 15 12 15 22"></polyline>
                    </svg>
                    Home
                  </button>

                  <div className="navbar__menu-divider"></div>

                  <button
                    className="navbar__menu-item navbar__menu-item--danger"
                    onClick={handleLogout}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}

          {type === 'new' && (
            <button
              className="navbar__action-btn navbar__action-btn--primary"
              onClick={handleSignIn}
            >
              Get Started
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
