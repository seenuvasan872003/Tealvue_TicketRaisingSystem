// ============================================================
//  client/src/pages/CreateAdminAccount.jsx
// ============================================================
//  Accessible by: Super Admin ONLY
//  Creates a new admin or super-admin account directly.
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { callFeatureApi } from '../services/apiResolver';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-toastify';
import logger from '../utils/logger';

const CreateAdminAccount = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'admin',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleNameChange = (val) => {
    setFormData(prev => {
      const next = { ...prev, name: val };
      const e = { ...errors };
      if (!val.trim()) {
        e.name = 'Full Name is required';
      } else if (!/^[a-zA-Z\s-]{2,50}$/.test(val)) {
        e.name = 'Name: 2–50 letters, spaces, or hyphens only';
      } else {
        delete e.name;
      }
      setErrors(e);
      return next;
    });
  };

  const handleEmailChange = (val) => {
    setFormData(prev => {
      const next = { ...prev, email: val };
      const e = { ...errors };
      if (!val.trim()) {
        e.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        e.email = 'Enter a valid email address';
      } else {
        delete e.email;
      }
      setErrors(e);
      return next;
    });
  };

  const handlePasswordChange = (val) => {
    setFormData(prev => {
      const next = { ...prev, password: val };
      const e = { ...errors };
      if (!val) {
        e.password = 'Password is required';
      } else if (val.length < 8) {
        e.password = 'Password must be at least 8 characters';
      } else if (!/[A-Z]/.test(val)) {
        e.password = 'Must contain at least one uppercase letter (A-Z)';
      } else if (!/[0-9]/.test(val)) {
        e.password = 'Must contain at least one number (0-9)';
      } else if (!/[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]/.test(val)) {
        e.password = 'Must contain at least one special character (!@# etc.)';
      } else {
        delete e.password;
      }
      if (next.confirmPassword && val !== next.confirmPassword) {
        e.confirmPassword = 'Passwords do not match';
      } else if (next.confirmPassword && val === next.confirmPassword) {
        delete e.confirmPassword;
      }
      setErrors(e);
      return next;
    });
  };

  const handleConfirmPasswordChange = (val) => {
    setFormData(prev => {
      const next = { ...prev, confirmPassword: val };
      const e = { ...errors };
      if (val !== next.password) {
        e.confirmPassword = 'Passwords do not match';
      } else {
        delete e.confirmPassword;
      }
      setErrors(e);
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (Object.keys(errors).length > 0) {
      toast.error('Please fix the errors before submitting');
      return;
    }
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      toast.error('All fields are required'); return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match'); return;
    }
    setLoading(true);
    logger.info('CreateAdminAccount', 'handleSubmit', `Creating ${formData.role} account for: ${formData.email}`, { api: '/api/users/create-admin', method: 'POST', action: 'Admin Account Create Start' });
    try {
      await callFeatureApi('create_admin', user.role, 'POST', formData);
      toast.success(`${formData.role === 'super-admin' ? 'Super Admin' : 'Admin'} account created successfully`);
      logger.info('CreateAdminAccount', 'handleSubmit', `${formData.role} account created for: ${formData.email}`, { api: '/api/users/create-admin', method: 'POST', status: 201, action: 'Admin Account Create Success' });
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'admin',
      });
      setErrors({});
      navigate('/admin/users');
    } catch (err) {
      const serverMessage = err?.response?.data?.message || 'Failed to create account';
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
        toast.error(serverMessage);
      }
      logger.error('CreateAdminAccount', 'handleSubmit', 'Admin account creation FAILED', err, { api: '/api/users/create-admin', method: 'POST', status: err?.response?.status, action: 'Admin Account Create Failure' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-body fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Create Admin Account</h1>
          <p className="page-subtitle">Add a new admin or super-admin to the system</p>
        </div>
      </div>

      <div className="create-admin-form" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '28px 32px', maxWidth: 500, margin: '0 auto' }}>
        <h2 style={{ color: '#e4e4e4', marginBottom: 20 }}>Create New Admin</h2>
        <form onSubmit={handleSubmit}>
          <div className="field-group">
            <label>Full Name</label>
            <input 
              className={errors.name ? 'input-error' : formData.name ? 'input-success' : ''}
              placeholder="Admin name" 
              value={formData.name} 
              onChange={e => handleNameChange(e.target.value)} 
            />
            {errors.name && <span className="error-msg" style={{ display: 'block', fontSize: 11, color: 'var(--color-high)', marginTop: 4 }}>{errors.name}</span>}
            {formData.name && !errors.name && <span className="success-msg" style={{ display: 'block', fontSize: 11, color: 'var(--color-teal)', marginTop: 4 }}>✓ Name is valid</span>}
          </div>

          <div className="field-group">
            <label>Email Address</label>
            <input 
              className={errors.email ? 'input-error' : formData.email ? 'input-success' : ''}
              type="email" 
              placeholder="admin@tealvue.com" 
              value={formData.email} 
              onChange={e => handleEmailChange(e.target.value)} 
            />
            {errors.email && <span className="error-msg" style={{ display: 'block', fontSize: 11, color: 'var(--color-high)', marginTop: 4 }}>{errors.email}</span>}
            {formData.email && !errors.email && <span className="success-msg" style={{ display: 'block', fontSize: 11, color: 'var(--color-teal)', marginTop: 4 }}>✓ Email is valid</span>}
          </div>

          <div className="field-group">
            <label>Temporary Password</label>
            <div style={{ position: 'relative' }}>
              <input 
                className={errors.password ? 'input-error' : formData.password ? 'input-success' : ''}
                type={showPassword ? "text" : "password"} 
                placeholder="Enter the password" 
                value={formData.password} 
                onChange={e => handlePasswordChange(e.target.value)} 
                style={{ width: '100%', paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#888', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <span className="error-msg" style={{ display: 'block', fontSize: 11, color: 'var(--color-high)', marginTop: 4 }}>{errors.password}</span>}
            <div style={{ marginTop: 6, padding: 8, background: '#161b22', borderRadius: 6, border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4 }}>Password Requirements:</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px', fontSize: 10 }}>
                <span style={{ color: formData.password.length >= 8 ? 'var(--color-teal)' : '#acacac' }}>
                  {formData.password.length >= 8 ? '✓' : '•'} Min 8 chars
                </span>
                <span style={{ color: /[A-Z]/.test(formData.password) ? 'var(--color-teal)' : '#acacac' }}>
                  {/[A-Z]/.test(formData.password) ? '✓' : '•'} 1 Uppercase (A-Z)
                </span>
                <span style={{ color: /[0-9]/.test(formData.password) ? 'var(--color-teal)' : '#acacac' }}>
                  {/[0-9]/.test(formData.password) ? '✓' : '•'} 1 Number (0-9)
                </span>
                <span style={{ color: /[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]/.test(formData.password) ? 'var(--color-teal)' : '#acacac' }}>
                  {/[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]/.test(formData.password) ? '✓' : '•'} 1 Special symbol
                </span>
              </div>
            </div>
          </div>

          <div className="field-group">
            <label>Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <input 
                className={errors.confirmPassword ? 'input-error' : formData.confirmPassword ? 'input-success' : ''}
                type={showConfirmPassword ? "text" : "password"} 
                placeholder="Confirm password" 
                value={formData.confirmPassword} 
                onChange={e => handleConfirmPasswordChange(e.target.value)} 
                style={{ width: '100%', paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#888', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.confirmPassword && <span className="error-msg" style={{ display: 'block', fontSize: 11, color: 'var(--color-high)', marginTop: 4 }}>{errors.confirmPassword}</span>}
            {formData.confirmPassword && !errors.confirmPassword && <span className="success-msg" style={{ display: 'block', fontSize: 11, color: 'var(--color-teal)', marginTop: 4 }}>✓ Passwords match</span>}
          </div>



          <div style={{ marginTop: 24 }}>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', justifyContent: 'center' }} 
              disabled={loading || Object.keys(errors).length > 0 || !formData.name || !formData.email || !formData.password || !formData.confirmPassword}
            >
              <UserPlus size={16} />
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAdminAccount;
