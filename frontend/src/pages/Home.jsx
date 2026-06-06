import { useNavigate } from 'react-router-dom';
import PageContainer from '../components/PageContainer';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();

  return (
    <PageContainer className="home">
      <div className="home__hero">
        <h1 className="home__title">Secure File Sharing</h1>
        <p className="home__subtitle">
          Share files instantly with a unique token. No registration required.
        </p>
      </div>

      <div className="home__cards">
        <div
          className="home__card home__card--upload"
          onClick={() => navigate('/upload')}
        >
          <div className="home__card-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
          </div>
          <h2>Upload File</h2>
          <p>
            Upload your file and get a share token to distribute to others
          </p>
          <div className="home__card-arrow">
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
        </div>

        <div
          className="home__card home__card--download"
          onClick={() => navigate('/download')}
        >
          <div className="home__card-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </div>
          <h2>Download File</h2>
          <p>
            Use a share token to download a file that was shared with you
          </p>
          <div className="home__card-arrow">
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
        </div>
      </div>

      <div className="home__features">
        <div className="home__feature">
          <div className="home__feature-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          </div>
          <h3>Secure</h3>
          <p>Your files are stored securely on our servers</p>
        </div>

        <div className="home__feature">
          <div className="home__feature-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          </div>
          <h3>Fast</h3>
          <p>Instant upload and download with minimal latency</p>
        </div>

        <div className="home__feature">
          <div className="home__feature-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <h3>Share</h3>
          <p>Easy token-based sharing with anyone, anywhere</p>
        </div>
      </div>
    </PageContainer>
  );
}
