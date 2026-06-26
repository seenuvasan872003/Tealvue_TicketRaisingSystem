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
import API from '../services/authApi';

const CreateUserAccount = () => {
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
      
      // Simple Password Check: Min 6 characters (Maintain whitelist testing rules)
      if (!val) {
        e.password = 'Password is required';
      } else if (val.length < 6) {
        e.password = 'Password must be at least 6 characters';
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
    try {
      await API.post('/users/create-user', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });

      toast.success('User account created successfully');
      navigate('/super-admin/users');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create user account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-body fade-in">
      <div style={{ maxWidth: 520, margin: '20px auto 0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 10,
            background: 'rgba(20, 160, 125, 0.1)', color: 'var(--color-teal)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <UserPlus size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#e4e4e4' }}>Create User Account</h1>
            <p style={{ fontSize: 12, color: '#acacac', margin: '2px 0 0 0' }}>Super Admin tool to create standard user accounts directly.</p>
          </div>
        </div>

        {/* Card Form */}
        <div style={{
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 12,
          padding: 28,
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
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
                required
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>

            {/* Password */}
            <div className="field-group">
              <label>Temporary Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className={`input ${errors.password ? 'input-error' : formData.password ? 'input-success' : ''}`}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••"
                  value={formData.password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  style={{ width: '100%', paddingRight: 40 }}
                  required
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
              {errors.password && <span className="error-text">{errors.password}</span>}
            </div>

            {/* Confirm Password */}
            <div className="field-group">
              <label>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className={`input ${errors.confirmPassword ? 'input-error' : formData.confirmPassword ? 'input-success' : ''}`}
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                  style={{ width: '100%', paddingRight: 40 }}
                  required
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
              {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
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
