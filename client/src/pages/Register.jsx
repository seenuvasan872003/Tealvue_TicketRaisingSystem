// ============================================================
//  client/src/pages/Register.jsx  —  Registration Page
// ============================================================
//  LUCIDE ICONS USED:  Ticket, Eye, EyeOff, UserPlus
//  API CALLS:
//    POST /api/auth/register  → { token, user }
//    Token stored in localStorage as "tealue_token"
// ============================================================

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import tealvueLogo from '../assets/tealvue1.png';
import logger from '../utils/logger';

const Register = () => {
  const { register } = useAuth();
  const navigate     = useNavigate();

  const [form,     setForm]    = useState({ name: '', email: '', password: '', role: 'user' });
  const [loading,  setLoading] = useState(false);
  const [error,    setError]   = useState('');
  const [showPass, setShowPass] = useState(false); // [STATE] toggle password visibility

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    // [VALIDATION] Password policy checks
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!/[A-Z]/.test(form.password)) {
      setError('Password must contain at least one uppercase letter.');
      return;
    }
    if (!/[0-9]/.test(form.password)) {
      setError('Password must contain at least one number.');
      return;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]/.test(form.password)) {
      setError('Password must contain at least one special character (!@#$).');
      return;
    }
    setLoading(true);
    logger.info('Register', 'handleSubmit', `Registration attempt for: ${form.email}`, { action: 'Register Form Submit' });
    try {
      // [API] POST /api/auth/register
      await register(form.name, form.email, form.password, form.role);
      toast.success('Account created! Welcome to Tealue.');
      logger.info('Register', 'handleSubmit', `Registration SUCCESS → navigating to /dashboard`, {
        api: '/api/auth/register', method: 'POST', status: 200, action: 'Register Success + Navigate',
      });
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      setError(msg);
      
      const errorsList = err?.response?.data?.errors;
      if (Array.isArray(errorsList) && errorsList.length > 0) {
        errorsList.forEach(e => {
          toast.error(`${e.path || 'Field'}: ${e.msg}`);
        });
      } else if (typeof errorsList === 'object' && errorsList !== null) {
        Object.keys(errorsList).forEach(k => {
          toast.error(`${k}: ${errorsList[k]}`);
        });
      } else {
        toast.error(msg);
      }
      logger.error('Register', 'handleSubmit', `Registration FAILED — ${msg}`, err, {
        api: '/api/auth/register', method: 'POST',
        status: err.response?.status,
        action: 'Register Failure',
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
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <img src={tealvueLogo} alt="Tealvue Logo" width="66" height="66" style={{ height: 66, width: 66 }} />
          </div>
          <h1>Tealvue</h1>
          <p>Create your account</p>
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
          {/* Full name */}
          <div className="form-group">
            <label htmlFor="reg-name">Full name</label>
            <input
              id="reg-name"
              className={`input ${form.name && (!/^[a-zA-Z\s-]{2,50}$/.test(form.name) ? 'input-error' : 'input-success')}`}
              type="text"
              placeholder="John Doe"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            {form.name && !/^[a-zA-Z\s-]{2,50}$/.test(form.name) && (
              <span className="error-msg" style={{ display: 'block', fontSize: 11, color: 'var(--color-high)', marginTop: 4 }}>
                Name: 2–50 letters, spaces, or hyphens only
              </span>
            )}
            {form.name && /^[a-zA-Z\s-]{2,50}$/.test(form.name) && (
              <span className="success-msg" style={{ display: 'block', fontSize: 11, color: 'var(--color-teal)', marginTop: 4 }}>
                ✓ Name is valid
              </span>
            )}
          </div>

          {/* Email */}
          <div className="form-group">
            <label htmlFor="reg-email">Email address</label>
            <input
              id="reg-email"
              className={`input ${form.email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? 'input-error' : 'input-success')}`}
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
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
            <label htmlFor="reg-password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="reg-password"
                className={`input ${form.password && (form.password.length < 6 ? 'input-error' : 'input-success')}`}
                type={showPass ? 'text' : 'password'}
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
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
                ✓ Password length is valid
              </span>
            )}
          </div>

          {/* Submit */}
          <button
            id="reg-submit"
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
            disabled={
              loading ||
              !form.name || !form.email || !form.password ||
              !/^[a-zA-Z\s-]{2,50}$/.test(form.name) ||
              !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ||
              form.password.length < 6
            }
          >
            {loading
              ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Creating account…</>
              : <><UserPlus size={16} /> Create Account</>
            }
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--color-text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--color-teal)', fontWeight: 500 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
