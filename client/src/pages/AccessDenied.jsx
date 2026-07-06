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
    <div className="min-h-screen flex items-center justify-center p-8 bg-[var(--color-bg)]">
      <div className="max-w-[480px] w-full text-center flex flex-col items-center gap-6">
        <div className="w-24 h-24 rounded-full bg-[linear-gradient(135deg,rgba(239,68,68,0.15),rgba(239,68,68,0.05))] border-2 border-[rgba(239,68,68,0.3)] flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.15),0_0_80px_rgba(239,68,68,0.06)] animate-[accessDeniedPulse_2.5s_ease-in-out_infinite]">
          <ShieldOff size={40} color="#ef4444" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-[1.75rem] font-extrabold text-[var(--color-text)] m-0 tracking-[-0.02em]">
            Access Denied
          </h1>
          <p className="mt-2 text-[0.95rem] text-[var(--color-text-muted)] leading-[1.6]">
            {message}
            <br />
            Please contact your <strong className="text-[var(--color-teal)]">Super Admin</strong> to request access.
          </p>
        </div>
        {featureId && (
          <div className="inline-flex items-center gap-2 py-[0.4rem] px-4 rounded-full bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[0.8rem] font-mono text-[#ef4444] tracking-[0.05em]">
            <span className="w-[6px] h-[6px] rounded-full bg-[#ef4444] inline-block" />
            {featureId}
          </div>
        )}
        <div className="w-full h-[1px] bg-[var(--color-border)] opacity-50" />
        <div className="flex gap-3 flex-wrap justify-center">
          <button
            id="access-denied-back-btn"
            onClick={() => navigate(-1)}
            className="btn btn-ghost gap-2"
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
        <p className="text-[0.78rem] text-[var(--color-text-muted)] opacity-60 m-0">
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