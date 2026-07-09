import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { X, UserPlus, ShieldCheck, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function CreateUserModal({ isOpen, type, onClose, onSuccess }) {
  const { token, user: currentUser } = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  // Reset form when modal opens or closes
  useEffect(() => {
    if (!isOpen) {
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      setErrors({});
      setServerError('');
    }
  }, [isOpen]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const tempErrors = {};
    
    if (!/^[a-zA-Z\s\-]{2,50}$/.test(name)) {
      tempErrors.name = 'Name must be 2–50 letters only';
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      tempErrors.email = 'Enter a valid email address';
    }
    
    // Password must be 8-32 chars with 1 uppercase, 1 lowercase, 1 number, and 1 special char
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,32}$/;
    if (!passwordRegex.test(password)) {
      tempErrors.password = 'Password must be 8–32 chars with uppercase, number, and special character';
    }
    
    if (password !== confirmPassword) {
      tempErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    
    if (!validate()) return;
    
    setSubmitting(true);
    
    try {
      const BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;
      const rolePrefix = currentUser?.role === 'super-admin' ? 'super-admin' : 'admin';
      
      const endpoint = type === 'admin' 
        ? `${BASE}/${rolePrefix}/create-admin` 
        : `${BASE}/${rolePrefix}/create-user`;
        
      await axios.post(
        endpoint,
        { name, email, password, confirmPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      onSuccess();
    } catch (err) {
      setServerError(err.response?.data?.message || 'Creation failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/75 z-[1000] flex items-center justify-center p-4 backdrop-blur-[4px] transition-opacity duration-300"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#111] border border-[#2d2d2d] rounded-xl p-7 w-full max-w-[480px] relative flex flex-col max-h-[90vh] max-sm:fixed max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:rounded-t-2xl max-sm:border-x-0 max-sm:border-b-0 animate-in fade-in slide-in-from-bottom duration-300">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-[#888] hover:text-white transition-colors p-1 rounded-md hover:bg-white/5"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex gap-3 items-start mb-6 shrink-0">
          <div className="bg-[#14a07d]/10 p-2 rounded-lg text-[#14a07d]">
            {type === 'admin' ? <ShieldCheck size={22} /> : <UserPlus size={22} />}
          </div>
          <div>
            <h3 className="text-base font-semibold text-white m-0">
              {type === 'admin' ? 'Create Admin Account' : 'Create User Account'}
            </h3>
            <p className="text-xs text-[#888] m-0 mt-0.5 leading-relaxed">
              {type === 'admin' 
                ? 'Admin can view tickets and manage teams' 
                : 'User can raise and track support tickets'}
            </p>
          </div>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="bg-red-500/10 border border-red-500/20 text-[#f87171] text-xs p-3 rounded-lg mb-4 shrink-0">
            {serverError}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto pr-1 max-h-full">
          
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-[#aaa] uppercase tracking-wider">Full Name *</label>
            <input 
              type="text"
              placeholder="Enter full name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors({ ...errors, name: '' });
              }}
              required
              className={`w-full bg-[#161616] border ${errors.name ? 'border-[#f87171]' : 'border-[#2d2d2d]'} rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#14a07d] transition-colors`}
            />
            {errors.name && <span className="text-[10px] text-[#f87171]">{errors.name}</span>}
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-[#aaa] uppercase tracking-wider">Email Address *</label>
            <input 
              type="email"
              placeholder="admin@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors({ ...errors, email: '' });
              }}
              required
              className={`w-full bg-[#161616] border ${errors.email ? 'border-[#f87171]' : 'border-[#2d2d2d]'} rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#14a07d] transition-colors`}
            />
            {errors.email && <span className="text-[10px] text-[#f87171]">{errors.email}</span>}
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-[#aaa] uppercase tracking-wider">Password *</label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'}
                placeholder="Min 8 chars with uppercase, number, symbol"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors({ ...errors, password: '' });
                }}
                required
                className={`w-full bg-[#161616] border ${errors.password ? 'border-[#f87171]' : 'border-[#2d2d2d]'} rounded-lg pl-3 pr-10 py-2 text-sm text-white focus:outline-none focus:border-[#14a07d] transition-colors`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-white"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <span className="text-[10px] text-[#f87171]">{errors.password}</span>}
          </div>

          {/* Confirm Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-[#aaa] uppercase tracking-wider">Confirm Password *</label>
            <div className="relative">
              <input 
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
                }}
                required
                className={`w-full bg-[#161616] border ${errors.confirmPassword ? 'border-[#f87171]' : 'border-[#2d2d2d]'} rounded-lg pl-3 pr-10 py-2 text-sm text-white focus:outline-none focus:border-[#14a07d] transition-colors`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-white"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.confirmPassword && <span className="text-[10px] text-[#f87171]">{errors.confirmPassword}</span>}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 mt-4">
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#14a07d] to-[#0f766e] hover:from-[#0f766e] hover:to-[#14a07d] text-white font-semibold text-[13px] py-2.5 rounded-lg cursor-pointer transition-all duration-300 shadow-md"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating Account...
                </>
              ) : (
                type === 'admin' ? 'Create Admin Account' : 'Create User Account'
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="w-full flex items-center justify-center py-2.5 text-[#e4e4e4] hover:text-white bg-transparent hover:bg-white/5 border border-white/10 rounded-lg cursor-pointer text-[13px] font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
          
        </form>
      </div>
    </div>,
    document.body
  );
}
