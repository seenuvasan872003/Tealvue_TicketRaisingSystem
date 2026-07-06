// ============================================================
//  client/src/pages/Login.jsx  —  Login Page
// ============================================================
//  LUCIDE ICONS USED:  Ticket, Eye, EyeOff, LogIn
//  API CALLS:
//    POST /api/auth/login  → { token, user }
//    Token stored in localStorage as "tealue_token"
// ============================================================

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import tealvueLogo from '../assets/tealvue1.png';
import logger from '../utils/logger';

const Login = () => {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [form,      setForm]    = useState({ email: '', password: '' });
  const [loading,   setLoading] = useState(false);
  const [error,     setError]   = useState('');
  const [showPass,  setShowPass] = useState(false); // [STATE] toggle password visibility

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    logger.info('Login', 'handleSubmit', `Login attempt for: ${form.email}`, { action: 'Login Form Submit' });
    try {
      // [API] POST /api/auth/login
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name}!`);
      logger.info('Login', 'handleSubmit', `Login SUCCESS → navigating for role: ${user.role}`, {
        api: '/api/auth/login', method: 'POST', status: 200, action: 'Login Success + Navigate',
      });
      switch (user.role) {
        case 'super-admin':
          navigate('/super-admin/dashboard');
          break;
        case 'admin':
          navigate('/admin/dashboard');
          break;
        case 'team_admin':
          navigate('/team-admin/dashboard');
          break;
        case 'team_user':
          navigate('/team-user/dashboard');
          break;
        case 'user':
        default:
          navigate('/dashboard');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      setError(msg);
      toast.error(msg);
      logger.error('Login', 'handleSubmit', `Login FAILED — ${msg}`, err, {
        api: '/api/auth/login', method: 'POST',
        status: err.response?.status,
        action: 'Login Failure',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card fade-in">

        {/* ── Logo ──────────────────────────────────── */}
        <div className="auth-logo">
          <div className="flex justify-center mb-[14px]">
            <img src={tealvueLogo} alt="Tealvue Logo" width="66" height="66" className="h-[66px] w-[66px]" />
          </div>
          <h1>Tealvue</h1>
          <p>Sign in to your account</p>
        </div>

        {/* ── Error alert ───────────────────────────── */}
        {error && (
          <div className="bg-[var(--color-high-bg)] border border-solid border-[rgba(248,81,73,0.3)] rounded-lg px-[14px] py-[10px] mb-[18px] text-[13px] text-[var(--color-high)]">
            {error}
          </div>
        )}

        {/* ── Form ──────────────────────────────────── */}
        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div className="form-group">
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              className={`input ${form.email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? 'input-error' : 'input-success')}`}
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="email"
            />
            {form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) && (
              <span className="error-msg block text-[11px] text-[var(--color-high)] mt-1">
                Enter a valid email address
              </span>
            )}
            {form.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) && (
              <span className="success-msg block text-[11px] text-[var(--color-teal)] mt-1">
                ✓ Email is valid
              </span>
            )}
          </div>

          {/* Password + show/hide toggle */}
          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <div className="relative">
              <input
                id="login-password"
                className={`input pr-[40px] ${form.password && (form.password.length < 6 ? 'input-error' : 'input-success')}`}
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="current-password"
              />
              {/* [ICON] Eye / EyeOff toggle */}
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-[var(--color-text-dim)] cursor-pointer flex p-0"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {form.password && form.password.length < 6 && (
              <span className="error-msg block text-[11px] text-[var(--color-high)] mt-1">
                Password must be at least 6 characters
              </span>
            )}
            {form.password && form.password.length >= 6 && (
              <span className="success-msg block text-[11px] text-[var(--color-teal)] mt-1">
                ✓ Length is valid
              </span>
            )}
          </div>

          {/* Submit */}
          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary btn-lg w-full justify-center mt-1"
            disabled={loading || !form.email || !form.password || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) || form.password.length < 6}
          >
            {loading
              ? <><span className="spinner w-4 h-4" /> Signing in…</>
              : <><LogIn size={16} /> Sign In</>
            }
          </button>
        </form>

        <p className="text-center mt-5 text-[13px] text-[var(--color-text-muted)]">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-[var(--color-teal)] font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
