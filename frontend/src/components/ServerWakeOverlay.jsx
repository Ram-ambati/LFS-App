/* @Author - Ram-Ambati
   @ ServerWakeOverlay - Displayed when the Render backend is cold-starting.
   @ Polls /api/auth/me every 5 seconds; fades out the moment a 200 OK is received.
*/
import { useEffect, useState, useRef, useCallback } from 'react';
import './ServerWakeOverlay.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
const POLL_INTERVAL_MS = 5000;

export default function ServerWakeOverlay({ onServerReady }) {
  const [elapsed, setElapsed] = useState(0);       // seconds since overlay appeared
  const [dots, setDots] = useState('');            // animated ellipsis
  const [isVisible, setIsVisible] = useState(true); // controls fade-out
  const pollingRef = useRef(null);
  const timerRef = useRef(null);
  const dotsRef = useRef(null);
  const startedRef = useRef(Date.now());

  const handleReady = useCallback(() => {
    // Stop all intervals
    clearInterval(pollingRef.current);
    clearInterval(timerRef.current);
    clearInterval(dotsRef.current);

    // Trigger CSS fade-out, then call parent callback
    setIsVisible(false);
    setTimeout(() => {
      onServerReady();
    }, 600); // matches CSS transition duration
  }, [onServerReady]);

  useEffect(() => {
    // ── Elapsed timer (ticks every second) ──────────────────────────────────
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedRef.current) / 1000));
    }, 1000);

    // ── Dots animation (cycles every 500ms) ─────────────────────────────────
    dotsRef.current = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    // ── Backend health polling (every 5 seconds) ─────────────────────────────
    const ping = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          method: 'GET',
          // No auth header — we just need ANY 200/401 to confirm the server is awake.
          // A 401 means the server is up but rejected an unauthenticated request — that's fine!
        });
        // 200 OK  → authenticated ping succeeded
        // 401     → server is awake but requires auth (still means it's UP)
        // Anything else (5xx, network error) → server still sleeping
        if (res.status === 200 || res.status === 401) {
          handleReady();
        }
      } catch {
        // Network error — server still cold-starting, keep waiting
      }
    };

    // Fire immediately on mount, then every POLL_INTERVAL_MS
    ping();
    pollingRef.current = setInterval(ping, POLL_INTERVAL_MS);

    return () => {
      clearInterval(pollingRef.current);
      clearInterval(timerRef.current);
      clearInterval(dotsRef.current);
    };
  }, [handleReady]);

  const formatElapsed = (s) => {
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  return (
    <div className={`swo-backdrop ${isVisible ? 'swo-visible' : 'swo-hidden'}`} aria-live="polite" aria-label="Connecting to server">
      <div className="swo-card">
        {/* Animated pulse rings */}
        <div className="swo-pulse-wrapper">
          <div className="swo-ring swo-ring-1" />
          <div className="swo-ring swo-ring-2" />
          <div className="swo-ring swo-ring-3" />
          <div className="swo-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.55a11 11 0 0 1 14.08 0" />
              <path d="M1.42 9a16 16 0 0 1 21.16 0" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <circle cx="12" cy="20" r="1" fill="currentColor" />
            </svg>
          </div>
        </div>

        {/* Text */}
        <h2 className="swo-title">Connecting to secure server{dots}</h2>
        <p className="swo-subtitle">
          Our free server is waking up from sleep.<br />
          This usually takes under 60 seconds.
        </p>

        {/* Elapsed timer */}
        <div className="swo-timer">
          <span className="swo-timer-label">Elapsed</span>
          <span className="swo-timer-value">{formatElapsed(elapsed)}</span>
        </div>

        {/* Pulsing progress bar */}
        <div className="swo-progress-track">
          <div className="swo-progress-bar" />
        </div>

        <p className="swo-hint">Polling every 5 seconds — will connect automatically</p>
      </div>
    </div>
  );
}
