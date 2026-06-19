import { useState } from 'react';
import PageContainer from '../components/PageContainer';
import UploadZone from '../components/UploadZone';
import TokenDisplay from '../components/TokenDisplay';
import LoadingSpinner from '../components/LoadingSpinner';
import PrimaryButton from '../components/PrimaryButton';
import { useAuth } from '../hooks/useAuth';
import { fileService } from '../services/api';
import './Upload.css';

export default function Upload() {
  const { limits } = useAuth();
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileSelect = (file) => {
    if (limits && file.size > limits.maxFileSize) {
      const maxMb = (limits.maxFileSize / (1024 * 1024)).toFixed(0);
      setError(`File size exceeds your limit of ${maxMb}MB.`);
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    setError(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    if (limits && selectedFile.size > limits.maxFileSize) {
      const maxMb = (limits.maxFileSize / (1024 * 1024)).toFixed(0);
      setError(`File size exceeds your limit of ${maxMb}MB.`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fileService.uploadFile(selectedFile);
      setUploadResult(result);
      setSelectedFile(null);
    } catch (err) {
      setError(err.message || 'Failed to upload file. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setUploadResult(null);
    setSelectedFile(null);
    setError(null);
  };

  if (uploadResult) {
    return (
      <PageContainer className="upload">
        <div className="upload__header">
          <h1>Upload Complete</h1>
        </div>

        <div className="upload__result">
          <TokenDisplay
            token={uploadResult.shareToken}
            fileName={uploadResult.originalFileName}
          />

          <button className="upload__reset" onClick={handleReset}>
            Upload Another File
          </button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="upload">
      <div className="upload__header">
        <h1>Upload File</h1>
        <p>Select a file and get a share token instantly</p>
      </div>

      <div className="upload__container">
        <div className="upload__zone-wrapper">
          <UploadZone onFileSelect={handleFileSelect} disabled={isLoading} />

          {selectedFile && (
            <div className="upload__file-info">
              <div className="upload__file-details">
                <div className="upload__file-icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                    <polyline points="13 2 13 9 20 9"></polyline>
                  </svg>
                </div>
                <div className="upload__file-meta">
                  <p className="upload__file-name">{selectedFile.name}</p>
                  <p className="upload__file-size">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              <button
                className="upload__remove-btn"
                onClick={() => {
                  setSelectedFile(null);
                  setError(null);
                }}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {error && <div className="upload__error">{error}</div>}

        <div className="upload__actions">
          <PrimaryButton
            onClick={handleUpload}
            disabled={!selectedFile || isLoading}
            size="large"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="small" />
                <span>Uploading...</span>
              </>
            ) : (
              'Upload File'
            )}
          </PrimaryButton>
        </div>

        <div className="upload__info">
          <p>
            Your file will be stored securely and you'll receive a unique share
            token. Share this token with anyone to allow them to download your
            file.
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
