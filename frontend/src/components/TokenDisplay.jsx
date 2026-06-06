import { useState } from 'react';
import './TokenDisplay.css';

export default function TokenDisplay({ token, fileName }) {
  const [copiedField, setCopiedField] = useState(null);

  const shareUrl = `${window.location.origin}/download/${token}`;

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="token-display">
      <div className="token-display__success">
        <svg
          className="token-display__check-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <h2>Upload successful!</h2>
        <p>Your file has been securely stored. Share it using the token below.</p>
      </div>

      <div className="token-display__items">
        <div className="token-display__item">
          <label className="token-display__label">Share Token</label>
          <div className="token-display__field">
            <code className="token-display__code">{token}</code>
            <button
              className="token-display__copy-btn"
              onClick={() => copyToClipboard(token, 'token')}
              title="Copy token"
            >
              {copiedField === 'token' ? (
                <>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="token-display__item">
          <label className="token-display__label">Share URL</label>
          <div className="token-display__field">
            <code className="token-display__code token-display__code--url">
              {shareUrl}
            </code>
            <button
              className="token-display__copy-btn"
              onClick={() => copyToClipboard(shareUrl, 'url')}
              title="Copy URL"
            >
              {copiedField === 'url' ? (
                <>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="token-display__info">
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
          <strong>Note:</strong> Share these details with others to allow them
          to download your file. Anyone with the share token can download it.
        </p>
      </div>
    </div>
  );
}
