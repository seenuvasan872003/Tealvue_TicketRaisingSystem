// ============================================================
//  client/src/pages/CreateUserAccount.jsx
// ============================================================
//  Accessible by: Super Admin ONLY
//  Creates a new user account directly.
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-toastify';
import { callFeatureApi } from '../services/apiResolver';
import { useAuth } from '../context/AuthContext';
import logger from '../utils/logger';
import { invalidateCache } from '../utils/cache';

const CreateUserAccount = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
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

      if (formData.confirmPassword && val !== formData.confirmPassword) {
        e.confirmPassword = 'Passwords do not match';
      } else {
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
      if (val !== formData.password) {
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
    
    // Final check
    if (Object.keys(errors).length > 0) {
      toast.error('Please fix form validation errors first.');
      return;
    }

    setLoading(true);
    logger.info('CreateUserAccount', 'handleSubmit', `Creating user account for: ${formData.email}`, { api: '/api/users/create-user', method: 'POST', action: 'User Account Create Start' });
    try {
      await callFeatureApi('create_user', user.role, 'POST', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });

      // Invalidate users cache
      invalidateCache('all_users');

      toast.success('User account created successfully');
      logger.info('CreateUserAccount', 'handleSubmit', `User account created for: ${formData.email}`, { api: '/api/users/create-user', method: 'POST', status: 201, action: 'User Account Create Success' });
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
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
      const serverMessage = err?.response?.data?.message || 'Failed to create user account';
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
      logger.error('CreateUserAccount', 'handleSubmit', 'User account creation FAILED', err, { api: '/api/users/create-user', method: 'POST', status: err?.response?.status, action: 'User Account Create Failure' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-body fade-in">
      <div className="max-w-[520px] mt-5 mx-auto mb-0">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-[42px] h-[42px] rounded-lg bg-[rgba(20,160,125,0.1)] text-[var(--color-teal)] flex items-center justify-center">
            <UserPlus size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold m-0 text-[#e4e4e4]">Create User Account</h1>
            <p className="text-xs text-[#acacac] m-0 mt-0.5">Super Admin tool to create standard user accounts directly.</p>
          </div>
        </div>

        {/* Card Form */}
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-7">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            {/* Name */}
            <div className="field-group">
              <label>Full Name</label>
              <input
                className={`input ${errors.name ? 'input-error' : formData.name ? 'input-success' : ''}`}
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
              />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>

            {/* Email */}
            <div className="field-group">
              <label>Email Address</label>
              <input
                className={`input ${errors.email ? 'input-error' : formData.email ? 'input-success' : ''}`}
                type="email"
                placeholder="john.doe@company.com"
                value={formData.email}
                onChange={(e) => handleEmailChange(e.target.value)}
                autoComplete="new-email"
                required
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>

            {/* Password */}
            <div className="field-group">
              <label>Temporary Password</label>
              <div className="relative">
                <input
                  className={`input w-full pr-10 ${errors.password ? 'input-error' : formData.password ? 'input-success' : ''}`}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••"
                  value={formData.password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-[#888] cursor-pointer flex items-center justify-center"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <span className="error-text">{errors.password}</span>}
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

            {/* Confirm Password */}
            <div className="field-group">
              <label>Confirm Password</label>
              <div className="relative">
                <input
                  className={`input w-full pr-10 ${errors.confirmPassword ? 'input-error' : formData.confirmPassword ? 'input-success' : ''}`}
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-[#888] cursor-pointer flex items-center justify-center"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="btn btn-primary w-full justify-center mt-2.5"
              disabled={loading || Object.keys(errors).length > 0}
            >
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default CreateUserAccount;
