import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import './WelcomeModal.css';

export default function WelcomeModal() {
  const navigate = useNavigate();
  const { startAsGuest } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleGuestClick = async () => {
    setIsLoading(true);
    await startAsGuest();
    navigate('/');
    setIsLoading(false);
  };

  const handleSignInClick = () => {
    authService.setWelcomeSeen();
    navigate('/signin');
  };

  return (
    <div className="welcome-overlay">
      <div className="welcome-modal">
        {/* Logo/Brand */}
        <div className="welcome-header">
          <div className="welcome-logo">LFS</div>
          <h1 className="welcome-title">Secure File Sharing</h1>
          <p className="welcome-subtitle">
            Share files instantly with secure tokens. No registration required.
          </p>
        </div>

        {/* Choice Buttons */}
        <div className="welcome-choices">
          {/* Guest Option */}
          <button
            className="welcome-choice welcome-choice--guest"
            onClick={handleGuestClick}
            disabled={isLoading}
            type="button"
          >
            <div className="welcome-choice-content">
              <div className="welcome-choice-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <div className="welcome-choice-text">
                <h2>Continue as Guest</h2>
                <p>Share files instantly without signup</p>
              </div>
            </div>
            <div className="welcome-choice-arrow">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </div>
          </button>

          {/* Sign In Option */}
          <button
            className="welcome-choice welcome-choice--signin"
            onClick={handleSignInClick}
            disabled={isLoading}
            type="button"
          >
            <div className="welcome-choice-content">
              <div className="welcome-choice-icon welcome-choice-icon--primary">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                  <polyline points="10 17 15 12 10 7"></polyline>
                  <line x1="15" y1="12" x2="3" y2="12"></line>
                </svg>
              </div>
              <div className="welcome-choice-text">
                <h2>Sign In / Create Account</h2>
                <p>Unlock higher limits and save your files</p>
              </div>
            </div>
            <div className="welcome-choice-arrow">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </div>
          </button>
        </div>

        {/* Features Highlight */}
        <div className="welcome-features">
          <div className="welcome-feature">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            <span>Secure & Private</span>
          </div>
          <div className="welcome-feature">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
            <span>Fast & Reliable</span>
          </div>
          <div className="welcome-feature">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="19" cy="12" r="1"></circle>
              <circle cx="5" cy="12" r="1"></circle>
            </svg>
            <span>Works Everywhere</span>
          </div>
        </div>

        {/* Footer */}
        <p className="welcome-footer">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
