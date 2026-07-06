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
      const redirectPaths = {
        'super-admin': '/super-admin/users',
        'admin': '/admin/users',
        'team_admin': '/team-admin/users',
        'team_user': '/team-user/users'
      };
      navigate(redirectPaths[user?.role] || '/users');
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

      <div className="create-admin-form bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl py-7 px-8 max-w-[500px] mx-auto">
        <h2 className="text-[#e4e4e4] mb-5">Create New Admin</h2>
        <form onSubmit={handleSubmit}>
          <div className="field-group">
            <label>Full Name</label>
            <input 
              className={errors.name ? 'input-error' : formData.name ? 'input-success' : ''}
              placeholder="Admin name" 
              value={formData.name} 
              onChange={e => handleNameChange(e.target.value)} 
            />
            {errors.name && <span className="error-msg block text-[11px] text-[var(--color-high)] mt-1">{errors.name}</span>}
            {formData.name && !errors.name && <span className="success-msg block text-[11px] text-[var(--color-teal)] mt-1">✓ Name is valid</span>}
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
            {errors.email && <span className="error-msg block text-[11px] text-[var(--color-high)] mt-1">{errors.email}</span>}
            {formData.email && !errors.email && <span className="success-msg block text-[11px] text-[var(--color-teal)] mt-1">✓ Email is valid</span>}
          </div>

          <div className="field-group">
            <label>Temporary Password</label>
            <div className="relative">
              <input 
                className={`${errors.password ? 'input-error' : formData.password ? 'input-success' : ''} w-full pr-10`}
                type={showPassword ? "text" : "password"} 
                placeholder="Enter the password" 
                value={formData.password} 
                onChange={e => handlePasswordChange(e.target.value)} 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-[#888] cursor-pointer flex items-center justify-center"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <span className="error-msg block text-[11px] text-[var(--color-high)] mt-1">{errors.password}</span>}
            <div className="mt-1.5 p-2 bg-[#161b22] rounded-md border border-[var(--color-border)]">
              <div className="text-[11px] font-semibold text-[var(--color-text-muted)] mb-1">Password Requirements:</div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
                <span className={formData.password.length >= 8 ? 'text-[var(--color-teal)]' : 'text-[#acacac]'}>
                  {formData.password.length >= 8 ? '✓' : '•'} Min 8 chars
                </span>
                <span className={/[A-Z]/.test(formData.password) ? 'text-[var(--color-teal)]' : 'text-[#acacac]'}>
                  {/[A-Z]/.test(formData.password) ? '✓' : '•'} 1 Uppercase (A-Z)
                </span>
                <span className={/[0-9]/.test(formData.password) ? 'text-[var(--color-teal)]' : 'text-[#acacac]'}>
                  {/[0-9]/.test(formData.password) ? '✓' : '•'} 1 Number (0-9)
                </span>
                <span className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(formData.password) ? 'text-[var(--color-teal)]' : 'text-[#acacac]'}>
                  {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(formData.password) ? '✓' : '•'} 1 Special symbol
                </span>
              </div>
            </div>
          </div>

          <div className="field-group">
            <label>Confirm Password</label>
            <div className="relative">
              <input 
                className={`${errors.confirmPassword ? 'input-error' : formData.confirmPassword ? 'input-success' : ''} w-full pr-10`}
                type={showConfirmPassword ? "text" : "password"} 
                placeholder="Confirm password" 
                value={formData.confirmPassword} 
                onChange={e => handleConfirmPasswordChange(e.target.value)} 
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-[#888] cursor-pointer flex items-center justify-center"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.confirmPassword && <span className="error-msg block text-[11px] text-[var(--color-high)] mt-1">{errors.confirmPassword}</span>}
            {formData.confirmPassword && !errors.confirmPassword && <span className="success-msg block text-[11px] text-[var(--color-teal)] mt-1">✓ Passwords match</span>}
          </div>



          <div className="mt-6">
            <button 
              type="submit" 
              className="btn btn-primary w-full justify-center" 
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
