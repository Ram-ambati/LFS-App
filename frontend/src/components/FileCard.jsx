import './FileCard.css';

export default function FileCard({ fileName, fileSize, uploadedAt }) {
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="file-card">
      <div className="file-card__icon">
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
      <div className="file-card__content">
        <h3 className="file-card__name" title={fileName}>
          {fileName}
        </h3>
        <div className="file-card__details">
          <span className="file-card__size">{formatFileSize(fileSize)}</span>
          {uploadedAt && (
            <>
              <span className="file-card__separator">•</span>
              <span className="file-card__date">{formatDate(uploadedAt)}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
