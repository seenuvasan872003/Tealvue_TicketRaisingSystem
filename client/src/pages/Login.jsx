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
import { Ticket, Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

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
    try {
      // [API] POST /api/auth/login
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card fade-in">

        {/* ── Logo ──────────────────────────────────── */}
        <div className="auth-logo">
          {/* [ICON] Ticket icon from lucide-react */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <Ticket size={36} color="var(--color-teal)" strokeWidth={1.8} />
          </div>
          <h1>Tealvue</h1>
          <p>Sign in to your account</p>
        </div>

        {/* ── Error alert ───────────────────────────── */}
        {error && (
          <div style={{
            background: 'var(--color-high-bg)', border: '1px solid rgba(248,81,73,0.3)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 18,
            fontSize: 13, color: 'var(--color-high)',
          }}>
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
              <span className="error-msg" style={{ display: 'block', fontSize: 11, color: 'var(--color-high)', marginTop: 4 }}>
                Enter a valid email address
              </span>
            )}
            {form.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) && (
              <span className="success-msg" style={{ display: 'block', fontSize: 11, color: 'var(--color-teal)', marginTop: 4 }}>
                ✓ Email is valid
              </span>
            )}
          </div>

          {/* Password + show/hide toggle */}
          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                className={`input ${form.password && (form.password.length < 6 ? 'input-error' : 'input-success')}`}
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="current-password"
                style={{ paddingRight: 40 }}
              />
              {/* [ICON] Eye / EyeOff toggle */}
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                style={{
                  position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none',
                  color: 'var(--color-text-dim)', cursor: 'pointer',
                  display: 'flex', padding: 0,
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {form.password && form.password.length < 6 && (
              <span className="error-msg" style={{ display: 'block', fontSize: 11, color: 'var(--color-high)', marginTop: 4 }}>
                Password must be at least 6 characters
              </span>
            )}
            {form.password && form.password.length >= 6 && (
              <span className="success-msg" style={{ display: 'block', fontSize: 11, color: 'var(--color-teal)', marginTop: 4 }}>
                ✓ Length is valid
              </span>
            )}
          </div>

          {/* Submit */}
          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
            disabled={loading || !form.email || !form.password || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) || form.password.length < 6}
          >
            {loading
              ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Signing in…</>
              : <><LogIn size={16} /> Sign In</>
            }
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--color-text-muted)' }}>
          Don&apos;t have an account?{' '}
          <Link to="/register" style={{ color: 'var(--color-teal)', fontWeight: 500 }}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
