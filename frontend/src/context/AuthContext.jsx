import React, { createContext, useState, useEffect, useRef, useCallback, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

// --- Session Timeout Config ---
const INACTIVITY_LIMIT_MS = 2 * 60 * 1000;   // 2 minutes
const WARNING_BEFORE_MS   = 30 * 1000;        // show warning 30s before logout

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Inactivity timeout state
  const [showWarning, setShowWarning]     = useState(false);
  const [countdown, setCountdown]         = useState(30);

  useEffect(() => {
    const initializeAuth = () => {
      const storedToken = localStorage.getItem('marine_erp_token');
      const storedUser = localStorage.getItem('marine_erp_user');

      if (storedToken && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          localStorage.removeItem('marine_erp_token');
          localStorage.removeItem('marine_erp_user');
        }
      }
      setLoading(false);
    };
    initializeAuth();
  }, []);

  // ── Inactivity Logic ──────────────────────────────────────────────────────

  const doLogout = useCallback(() => {
    setShowWarning(false);
    localStorage.removeItem('marine_erp_token');
    localStorage.removeItem('marine_erp_user');
    localStorage.removeItem('marine_erp_last_activity');
    setUser(null);
    window.location.href = '/login?expired=true';
  }, []);

  const resetIdleTimer = useCallback(() => {
    if (!user) return;
    localStorage.setItem('marine_erp_last_activity', Date.now().toString());
    setShowWarning(false);
  }, [user]);

  // Master monitoring interval and visibility change listeners
  useEffect(() => {
    if (!user) {
      setShowWarning(false);
      return;
    }

    const checkInactivity = () => {
      const lastActivity = Number(localStorage.getItem('marine_erp_last_activity') || Date.now());
      const elapsed = Date.now() - lastActivity;

      if (elapsed >= INACTIVITY_LIMIT_MS) {
        doLogout();
      } else if (elapsed >= INACTIVITY_LIMIT_MS - WARNING_BEFORE_MS) {
        const remaining = Math.max(0, Math.ceil((INACTIVITY_LIMIT_MS - elapsed) / 1000));
        setCountdown(remaining);
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    };

    // Run check immediately on mount/focus
    checkInactivity();

    // Check every second (resilient to browser background throttling)
    const interval = setInterval(checkInactivity, 1000);

    // Visibility listener: executes immediately when user focuses back on the tab
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    // Reset timestamp on mount/login
    localStorage.setItem('marine_erp_last_activity', Date.now().toString());

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user, doLogout]);

  // Attach user interaction listeners to reset the activity timestamp
  useEffect(() => {
    if (!user) return;

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    const handler = () => resetIdleTimer();

    events.forEach(e => window.addEventListener(e, handler, { passive: true }));
    return () => {
      events.forEach(e => window.removeEventListener(e, handler));
    };
  }, [user, resetIdleTimer]);

  const stayLoggedIn = useCallback(() => {
    localStorage.setItem('marine_erp_last_activity', Date.now().toString());
    setShowWarning(false);
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        localStorage.setItem('marine_erp_token', res.data.token);
        localStorage.setItem('marine_erp_user', JSON.stringify(res.data.user));
        setUser(res.data.user);
        return { success: true };
      }
      return { success: false, message: res.data.message || 'Login failed' };
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid email or password';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };



  const logout = () => {
    localStorage.removeItem('marine_erp_token');
    localStorage.removeItem('marine_erp_user');
    localStorage.removeItem('marine_erp_last_activity');
    setUser(null);
  };

  const hasRole = (roles = []) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, hasRole }}>
      {children}

      {/* ── Inactivity Warning Modal ───────────────────────────────── */}
      {showWarning && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: 'var(--modal-bg, #1e293b)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '1.25rem',
              padding: '2rem 2.25rem',
              maxWidth: '380px', width: '90%',
              textAlign: 'center',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
              animation: 'slideUp 0.25s ease',
            }}
          >
            {/* Icon */}
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: countdown <= 10 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1rem',
              transition: 'background 0.3s',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                stroke={countdown <= 10 ? '#ef4444' : '#f59e0b'} strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>

            {/* Countdown ring */}
            <div style={{
              fontSize: '3rem', fontWeight: 800,
              color: countdown <= 10 ? '#ef4444' : '#f59e0b',
              lineHeight: 1, marginBottom: '0.5rem',
              transition: 'color 0.3s',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {countdown}
            </div>

            <h3 style={{ color: '#f1f5f9', fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Session Expiring Soon
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.8rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              You've been inactive for a while. You'll be automatically logged out in{' '}
              <strong style={{ color: '#f1f5f9' }}>{countdown} second{countdown !== 1 ? 's' : ''}</strong>.
            </p>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={doLogout}
                style={{
                  flex: 1, padding: '0.6rem 1rem',
                  borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent', color: '#94a3b8',
                  fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                }}
              >
                Log Out Now
              </button>
              <button
                onClick={stayLoggedIn}
                style={{
                  flex: 1, padding: '0.6rem 1rem',
                  borderRadius: '0.75rem', border: 'none',
                  background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                  color: '#fff', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
                }}
              >
                Stay Logged In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-up animation */}
      <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
