import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageContainer from '../components/PageContainer';
import FileCard from '../components/FileCard';
import LoadingSpinner from '../components/LoadingSpinner';
import PrimaryButton from '../components/PrimaryButton';
import { fileService, downloadBlob } from '../services/api';
import './Download.css';

const extractToken = (input) => {
  if (!input) return '';
  const trimmed = input.trim();
  if (trimmed.includes('/download/')) {
    const parts = trimmed.split('/download/');
    const tokenPart = parts[parts.length - 1];
    return tokenPart.split('?')[0].trim();
  }
  return trimmed;
};

export default function Download() {
  const { token: urlToken } = useParams();
  const navigate = useNavigate();

  const [token, setToken] = useState(urlToken || '');
  const [fileInfo, setFileInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  const handleFetch = async (tokenToFetch) => {
    const extractedToken = extractToken(tokenToFetch);
    if (!extractedToken) {
      setError('Please enter a valid share token');
      return;
    }

    setIsLoading(true);
    setError(null);
    setFileInfo(null);

    try {
      const info = await fileService.getFileInfo(extractedToken);
      setFileInfo(info);
      setSearched(true);
    } catch (err) {
      setError(
        err.message ||
          'File not found. Please check your share token and try again.'
      );
      setSearched(true);
      console.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-fetch file info if token is in URL
  useEffect(() => {
    if (urlToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      handleFetch(urlToken);
    }
  }, [urlToken]);


  const handleSearch = () => {
    const extracted = extractToken(token);
    setToken(extracted);
    handleFetch(extracted);
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);

    try {
      const blob = await fileService.downloadFile(token);
      downloadBlob(blob, fileInfo.originalFileName);
    } catch (err) {
      setError('Failed to download file. Please try again.');
      console.error('Download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleReset = () => {
    setToken('');
    setFileInfo(null);
    setError(null);
    setSearched(false);
    navigate('/download');
  };

  if (fileInfo) {
    return (
      <PageContainer className="download">
        <div className="download__header">
          <h1>Download File</h1>
        </div>

        <div className="download__preview">
          <FileCard
            fileName={fileInfo.originalFileName}
            fileSize={fileInfo.fileSize}
            uploadedAt={fileInfo.createdAt}
          />

          <div className="download__details">
            <div className="download__detail-item">
              <span className="download__detail-label">File Name</span>
              <span className="download__detail-value">
                {fileInfo.originalFileName}
              </span>
            </div>

            {fileInfo.createdAt && (
              <div className="download__detail-item">
                <span className="download__detail-label">Uploaded</span>
                <span className="download__detail-value">
                  {new Date(fileInfo.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}

            <div className="download__detail-item">
              <span className="download__detail-label">File Size</span>
              <span className="download__detail-value">
                {(fileInfo.fileSize / 1024).toFixed(2)} KB
              </span>
            </div>
          </div>

          <div className="download__actions">
            <PrimaryButton
              onClick={handleDownload}
              disabled={isDownloading}
              size="large"
            >
              {isDownloading ? (
                <>
                  <LoadingSpinner size="small" />
                  <span>Downloading...</span>
                </>
              ) : (
                'Download File'
              )}
            </PrimaryButton>

            <button className="download__back-btn" onClick={handleReset}>
              Try Another Token
            </button>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="download">
      <div className="download__header">
        <h1>Download File</h1>
        <p>Enter a share token to download a file</p>
      </div>

      <div className="download__form">
        <div className="download__input-group">
          <label htmlFor="token-input" className="download__label">
            Share Token
          </label>
          <input
            id="token-input"
            type="text"
            className="download__input"
            placeholder="Paste your share token here..."
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              if (searched) setSearched(false);
              setError(null);
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            disabled={isLoading}
          />
          <p className="download__hint">
            You can also use a download link: /download/your-token-here
          </p>
        </div>

        {error && <div className="download__error">{error}</div>}

        {searched && !fileInfo && !error && (
          <div className="download__loading">
            <LoadingSpinner />
            <p>Searching for file...</p>
          </div>
        )}

        <PrimaryButton
          onClick={handleSearch}
          disabled={!token.trim() || isLoading}
          size="large"
          className="download__search-btn"
        >
          {isLoading ? 'Searching...' : 'Search'}
        </PrimaryButton>

        <div className="download__info">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <p>
            Enter the share token provided by the file uploader. The token is a
            unique identifier that gives you access to the shared file.
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
