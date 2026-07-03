// ============================================================
//  client/src/pages/AccessDenied.jsx  —  Feature Access Denied
// ============================================================

import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { ShieldOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getStartPath } from '../config/featureHelpers';
import API from '../services/authApi';
import { toast } from 'react-toastify';

const REASON_MESSAGES = {
  WRONG_ROLE:           'Your role does not have access to this page.',
  FEATURE_NOT_ASSIGNED: 'You have not been assigned this feature. Contact your administrator.',
  default:              'You do not have permission to view this page.'
};

const AccessDenied = () => {
  const { state }    = useLocation();
  const { user, features, logout, refreshUser } = useAuth();
  const navigate     = useNavigate();

  const reason    = state?.reason || 'default';
  const message   = REASON_MESSAGES[reason] || REASON_MESSAGES.default;
  const featureId = state?.featureId || '';

  useEffect(() => {
    const reportViolation = async () => {
      try {
        const res = await API.post('/role-features/violation', { 
          featureId: featureId || 'unknown',
          route: window.location.pathname
        });
        if (res.data.isBlocked) {
          toast.error("Account blocked due to multiple violations.");
          logout();
          navigate('/login');
        } else {
          refreshUser();
        }
      } catch (err) {
        console.error('Failed to report route violation:', err);
      }
    };
    reportViolation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featureId]);

  const handleGoHome = () => {
    const startPath = getStartPath(features, user?.role);
    navigate(startPath, { replace: true });
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      background: 'var(--color-bg)',
    }}>
      <div style={{
        maxWidth: 480,
        width: '100%',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.5rem',
      }}>
        <div style={{
          width: 96,
          height: 96,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))',
          border: '2px solid rgba(239,68,68,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 40px rgba(239,68,68,0.15), 0 0 80px rgba(239,68,68,0.06)',
          animation: 'accessDeniedPulse 2.5s ease-in-out infinite',
        }}>
          <ShieldOff size={40} color="#ef4444" strokeWidth={1.5} />
        </div>
        <div>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: 'var(--color-text)',
            margin: 0,
            letterSpacing: '-0.02em',
          }}>
            Access Denied
          </h1>
          <p style={{
            marginTop: '0.5rem',
            fontSize: '0.95rem',
            color: 'var(--color-text-muted)',
            lineHeight: 1.6,
          }}>
            {message}
            <br />
            Please contact your <strong style={{ color: 'var(--color-teal)' }}>Super Admin</strong> to request access.
          </p>
        </div>
        {featureId && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 1rem',
            borderRadius: 999,
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            fontSize: '0.8rem',
            fontFamily: 'monospace',
            color: '#ef4444',
            letterSpacing: '0.05em',
          }}>
            <span style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#ef4444',
              display: 'inline-block',
            }} />
            {featureId}
          </div>
        )}
        <div style={{
          width: '100%',
          height: 1,
          background: 'var(--color-border)',
          opacity: 0.5,
        }} />
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            id="access-denied-back-btn"
            onClick={() => navigate(-1)}
            className="btn btn-ghost"
            style={{ gap: '0.5rem' }}
          >
            <ArrowLeft size={15} />
            Go Back
          </button>
          <button
            id="access-denied-dashboard-btn"
            onClick={handleGoHome}
            className="btn btn-primary"
          >
            Go to Dashboard
          </button>
        </div>
        <p style={{
          fontSize: '0.78rem',
          color: 'var(--color-text-muted)',
          opacity: 0.6,
          margin: 0,
        }}>
          Logged in as <strong>{user?.name}</strong> ({user?.role})
        </p>
      </div>
      <style>{`
        @keyframes accessDeniedPulse {
          0%, 100% { box-shadow: 0 0 40px rgba(239,68,68,0.15), 0 0 80px rgba(239,68,68,0.06); }
          50%       { box-shadow: 0 0 60px rgba(239,68,68,0.25), 0 0 100px rgba(239,68,68,0.12); }
        }
      `}</style>
    </div>
  );
};

export default AccessDenied;