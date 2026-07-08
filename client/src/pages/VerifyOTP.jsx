import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import OTPInput from '../components/OTPInput';
import { ShieldAlert, ArrowLeft, Loader2, Mail } from 'lucide-react';

export default function VerifyOTP({ type }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth(); // used to complete login after OTP success

  // Get email from location state
  const email = location.state?.email || '';

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(600); // 10 minutes (600 seconds)
  const [resendCooldown, setResendCooldown] = useState(60); // 60 seconds
  const [attempts, setAttempts] = useState(0); // number of wrong attempts
  const [blocked, setBlocked] = useState(false);
  const [blockedUntil, setBlockedUntil] = useState(null);
  const [resendCount, setResendCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [shake, setShake] = useState(false);

  // If no email, redirect back
  useEffect(() => {
    if (!email) {
      navigate(type === 'register' ? '/register' : '/login', { replace: true });
    }
  }, [email, navigate, type]);

  // Timer countdown
  useEffect(() => {
    if (timer <= 0 || blocked) return;
    const t = setInterval(() => setTimer((prev) => prev - 1), 1000);
    return () => clearInterval(t);
  }, [timer, blocked]);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0 || blocked) return;
    const t = setInterval(() => setResendCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown, blocked]);

  // Format MM:SS
  const formatTime = (secs) => {
    const mins = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${mins}:${s}`;
  };

  // Block timer countdown
  const [remainingBlockSecs, setRemainingBlockSecs] = useState(0);
  useEffect(() => {
    if (!blocked || !blockedUntil) return;
    const updateBlockTimer = () => {
      const diff = Math.ceil((new Date(blockedUntil) - new Date()) / 1000);
      if (diff <= 0) {
        setBlocked(false);
        setBlockedUntil(null);
        setAttempts(0);
        setError('');
      } else {
        setRemainingBlockSecs(diff);
      }
    };
    updateBlockTimer();
    const t = setInterval(updateBlockTimer, 1000);
    return () => clearInterval(t);
  }, [blocked, blockedUntil]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const otp = digits.join('');
    if (otp.length < 6 || loading || blocked || timer <= 0) return;

    setLoading(true);
    setError('');
    setShake(false);

    try {
      const BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth`;
      const url = type === 'register' ? `${BASE}/verify-register` : `${BASE}/verify-login`;

      const res = await axios.post(url, { email, otp });

      setSuccess(true);
      setAttempts(0);

      // Both register-verify and login-verify now return { token, user }
      // Auto-login and go straight to dashboard for both flows
      setTimeout(async () => {
        try {
          await loginWithToken(res.data.token, res.data.user);
        } catch (_) {}
        navigate('/', { replace: true });
      }, 800);
    } catch (err) {
      setDigits(['', '', '', '', '', '']);
      const resData = err.response?.data;

      if (resData?.code === 'OTP_WRONG') {
        const remaining = resData.remainingAttempts;
        const currentWrong = 5 - remaining;
        setAttempts(currentWrong);
        setError(`Incorrect OTP. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`);
        setShake(true);
      } else if (resData?.code === 'OTP_EXPIRED') {
        setTimer(0);
        setError('OTP has expired. Please request a new one.');
      } else if (resData?.code === 'OTP_BLOCKED' || err.response?.status === 429) {
        setBlocked(true);
        const blockUntilTime = resData?.blockedUntil || new Date(Date.now() + 20 * 60 * 1000);
        setBlockedUntil(blockUntilTime);
        setAttempts(5);
        setError(`Account blocked. Please try again later.`);
      } else {
        setError(resData?.message || 'Verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Auto submit when 6 digits are filled
  useEffect(() => {
    const full = digits.join('');
    if (full.length === 6 && !blocked && timer > 0) {
      handleSubmit();
    }
  }, [digits]);

  const handleResend = async () => {
    if (resendCooldown > 0 || blocked || resendCount >= 3) return;

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth`;
      const res = await axios.post(`${BASE}/resend-otp`, { email, type });

      setTimer(600); // reset 10m timer
      setResendCooldown(60); // reset 60s cooldown
      setDigits(['', '', '', '', '', '']);
      if (res.data.resendCount !== undefined) {
        setResendCount(res.data.resendCount);
      } else {
        setResendCount((prev) => prev + 1);
      }
      setError('');
    } catch (err) {
      const resData = err.response?.data;
      if (resData?.code === 'OTP_BLOCKED') {
        setBlocked(true);
        setBlockedUntil(resData.blockedUntil || new Date(Date.now() + 20 * 60 * 1000));
        setAttempts(5);
        setError(`Account blocked.`);
      } else {
        setError(resData?.message || 'Failed to resend OTP.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (blocked) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="max-w-[420px] w-full bg-[#111] border border-white/10 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-500 animate-pulse">
            <ShieldAlert size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white tracking-wide">Account Temporarily Blocked</h2>
            <p className="text-sm text-white/40 leading-relaxed">
              Too many incorrect OTP attempts. For security reasons, your account is temporarily blocked.
            </p>
          </div>
          <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
            <p className="text-xs text-white/40">Retry available in</p>
            <p className="text-3xl font-mono font-bold text-red-400 mt-1">
              {formatTime(remainingBlockSecs)}
            </p>
          </div>
          <p className="text-xs text-white/30">
            You can try again at {blockedUntil ? new Date(blockedUntil).toLocaleTimeString() : '—'}
          </p>
          <Link
            to={type === 'register' ? '/register' : '/login'}
            className="flex items-center justify-center gap-2 text-xs text-teal-400 hover:text-teal-300 font-medium transition-colors pt-2"
          >
            <ArrowLeft size={14} /> Go Back
          </Link>
        </div>
      </div>
    );
  }

  const isComplete = digits.join('').length === 6;

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="max-w-[420px] w-full bg-[#111] border border-white/10 rounded-2xl p-8 space-y-6 shadow-2xl">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500/20 to-teal-700/20 border border-teal-500/30 flex items-center justify-center mx-auto text-teal-400">
            <Mail size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">Check your email</h2>
            <p className="text-sm text-white/40 mt-1">
              Enter the 6-digit code sent to
            </p>
            <p className="text-sm text-[#eac253] font-medium truncate mt-0.5" title={email}>
              {email}
            </p>
          </div>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <OTPInput
            value={digits}
            onChange={setDigits}
            error={shake}
            success={success}
            disabled={loading}
          />

          {/* Progress dots */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((dotIndex) => (
              <div
                key={dotIndex}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  dotIndex <= attempts ? 'bg-red-500 shadow-[0_0_6px_#ef4444]' : 'bg-[#333]'
                }`}
              />
            ))}
          </div>

          {/* Expiry countdown */}
          <div className="text-center text-xs">
            {timer > 0 ? (
              <span className={timer <= 60 ? 'text-red-400 font-medium' : 'text-white/40'}>
                Code expires in {formatTime(timer)}
              </span>
            ) : (
              <span className="text-red-400 font-medium">Code expired</span>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!isComplete || loading || timer <= 0}
            className="w-full h-11 bg-gradient-to-r from-[#c3862b] to-[#eac253] text-black font-bold rounded-xl transition-all duration-300 hover:shadow-[0_0_15px_rgba(234,194,83,0.4)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Verifying...
              </>
            ) : (
              'Verify'
            )}
          </button>
        </form>

        {/* Error message */}
        {error && (
          <p className="text-xs text-red-400 text-center font-medium leading-relaxed bg-red-500/5 border border-red-500/10 rounded-lg p-2.5">
            {error}
          </p>
        )}

        {/* Resend Actions */}
        <div className="text-center text-xs border-t border-white/5 pt-5 space-y-3">
          <div>
            <span className="text-white/40">Didn't receive it? </span>
            {resendCount >= 3 ? (
              <span className="text-red-400/80 font-medium block mt-1">Maximum resend limit reached</span>
            ) : resendCooldown > 0 ? (
              <span className="text-white/30 font-medium">Resend in {resendCooldown}s</span>
            ) : (
              <button
                onClick={handleResend}
                disabled={loading}
                className="text-[#d3a73c] hover:text-[#eac253] font-bold transition-colors underline bg-transparent border-none outline-none cursor-pointer"
              >
                Resend OTP
              </button>
            )}
          </div>

          <div className="pt-2">
            <Link
              to={type === 'register' ? '/register' : '/login'}
              className="text-white/40 hover:text-white/70 font-medium inline-flex items-center gap-1 transition-colors"
            >
              Wrong email? Go back
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
