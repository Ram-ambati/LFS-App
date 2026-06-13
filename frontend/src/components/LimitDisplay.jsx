import { useAuth } from '../hooks/useAuth';
import './LimitDisplay.css';

export default function LimitDisplay() {
  const { type, limits } = useAuth();

  if (type === 'loading' || type === 'new') {
    return null;
  }

  if (!limits) {
    return null;
  }

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className={`limit-display limit-display--${type}`}>
      <div className="limit-display__content">
        <div className="limit-display__label">
          {type === 'guest' ? '🔓 Guest Limits' : '⭐ Premium Limits'}
        </div>
        <div className="limit-display__info">
          <span className="limit-display__item">
            <strong>{formatBytes(limits.maxFileSize)}</strong> per file
          </span>
          <span className="limit-display__separator">•</span>
          <span className="limit-display__item">
            up to <strong>{limits.maxFiles}</strong> files
          </span>
        </div>
      </div>
    </div>
  );
}
