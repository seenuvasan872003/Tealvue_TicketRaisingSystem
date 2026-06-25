// ============================================================
//  client/src/pages/CreateAdminAccount.jsx
// ============================================================
//  Accessible by: Super Admin ONLY
//  Creates a new admin or super-admin account directly.
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAdminAccount } from '../services/userApi';
import { UserPlus } from 'lucide-react';
import { toast } from 'react-toastify';

const CreateAdminAccount = () => {
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
      } else if (val.length < 6) {
        e.password = 'Password must be at least 6 characters';
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
    try {
      await createAdminAccount(formData);
      toast.success(`${formData.role === 'super-admin' ? 'Super Admin' : 'Admin'} account created successfully`);
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
      toast.error(err?.response?.data?.message || 'Failed to create account');
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
            <input 
              className={errors.password ? 'input-error' : formData.password ? 'input-success' : ''}
              type="password" 
              placeholder="Enter the password" 
              value={formData.password} 
              onChange={e => handlePasswordChange(e.target.value)} 
            />
            {errors.password && <span className="error-msg" style={{ display: 'block', fontSize: 11, color: 'var(--color-high)', marginTop: 4 }}>{errors.password}</span>}
            {formData.password && !errors.password && <span className="success-msg" style={{ display: 'block', fontSize: 11, color: 'var(--color-teal)', marginTop: 4 }}>✓ Password is valid</span>}
          </div>

          <div className="field-group">
            <label>Confirm Password</label>
            <input 
              className={errors.confirmPassword ? 'input-error' : formData.confirmPassword ? 'input-success' : ''}
              type="password" 
              placeholder="Confirm password" 
              value={formData.confirmPassword} 
              onChange={e => handleConfirmPasswordChange(e.target.value)} 
            />
            {errors.confirmPassword && <span className="error-msg" style={{ display: 'block', fontSize: 11, color: 'var(--color-high)', marginTop: 4 }}>{errors.confirmPassword}</span>}
            {formData.confirmPassword && !errors.confirmPassword && <span className="success-msg" style={{ display: 'block', fontSize: 11, color: 'var(--color-teal)', marginTop: 4 }}>✓ Passwords match</span>}
          </div>

          <div className="field-group">
            <label>Role</label>
            <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
              <option value="admin">Admin</option>
              <option value="super-admin">Super Admin (Max 2 total)</option>
            </select>
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
