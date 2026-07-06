/* eslint-disable no-useless-escape */
// ============================================================
//  client/src/pages/CreateTicket.jsx  —  Create New Ticket
// ============================================================
//  Updated: Simplified for user facing inputs only.
//  Priority and Due Date are removed entirely.
//  Attachments: Max 3 files, 5MB limit, JPG/PNG/WEBP/PDF only.
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Paperclip } from 'lucide-react';
import { createTicket, getCategories } from '../services/ticketApi';
import { toast } from 'react-toastify';
import logger from '../utils/logger';

const CreateTicket = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [categories, setCategories] = useState(['No Category', 'General', 'Technical', 'Billing', 'HR', 'Other']);
  const [form, setForm] = useState({
    title: '', description: '', category: 'No Category'
  });
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState({});

  useEffect(() => {
    const fetchCats = async () => {
      logger.info('CreateTicket', 'fetchCats', 'Fetching ticket categories', { api: '/api/teams/categories', method: 'GET', action: 'Categories Load Start' });
      try {
        const { data } = await getCategories();
        if (data && data.length > 0) {
          setCategories(['No Category', ...data]);
          logger.info('CreateTicket', 'fetchCats', `Categories loaded — ${data.length} available`, { api: '/api/teams/categories', method: 'GET', action: 'Categories Load Success' });
        }
      } catch (err) {
        logger.error('CreateTicket', 'fetchCats', 'Failed to load categories', err, { api: '/api/teams/categories', method: 'GET', action: 'Categories Load Failure' });
        console.error('Failed to load categories', err);
      }
    };
    fetchCats();
  }, []);

  const validate = () => {
    const e = {};
    if (!form.title.trim()) {
      e.title = 'Title is required';
    } else if (form.title.length < 5 || form.title.length > 100) {
      e.title = 'Title must be 5–100 characters';
    } else if (!/^[a-zA-Z0-9\s.,!?()'\-]{5,100}$/.test(form.title)) {
      e.title = 'Title contains invalid characters';
    }

    if (!form.description.trim()) {
      e.description = 'Description is required';
    } else if (form.description.length < 20 || form.description.length > 2000) {
      e.description = 'Description must be 20–2000 characters';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    
    // Check total files count (max 3)
    if (files.length + newFiles.length > 3) {
      toast.error('Maximum 3 attachments allowed');
      return;
    }

    // Allowed types: JPG, PNG, WEBP, PDF
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const validFiles = newFiles.filter(f => {
      const isRightType = allowedTypes.includes(f.type) || 
        f.name.toLowerCase().endsWith('.jpg') || 
        f.name.toLowerCase().endsWith('.jpeg') || 
        f.name.toLowerCase().endsWith('.png') || 
        f.name.toLowerCase().endsWith('.webp') || 
        f.name.toLowerCase().endsWith('.pdf');
      
      const isRightSize = f.size <= 5 * 1024 * 1024;
      
      if (!isRightType) {
        toast.error(`File ${f.name} is not an allowed type (JPG/PNG/WEBP/PDF only)`);
      }
      if (!isRightSize) {
        toast.error(`File ${f.name} exceeds the 5MB size limit`);
      }
      
      return isRightType && isRightSize;
    });

    setFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index) => setFiles(prev => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      logger.warn('CreateTicket', 'handleSubmit', 'Form validation failed — ticket not submitted', { action: 'Ticket Form Validation Failure' });
      return;
    }
    setLoading(true);
    logger.info('CreateTicket', 'handleSubmit', `Submitting ticket: "${form.title}" | category: ${form.category}`, { api: '/api/tickets', method: 'POST', action: 'Ticket Create Start' });
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('category', form.category === 'No Category' ? '' : form.category);
      files.forEach(f => fd.append('attachments', f));

      const { data } = await createTicket(fd);
      toast.success('Ticket created successfully!');
      logger.info('CreateTicket', 'handleSubmit', `Ticket created successfully \u2014 ID: ${data._id}`, { api: '/api/tickets', method: 'POST', status: 201, action: 'Ticket Create Success' });
      navigate(`/tickets/${data._id}`);
    } catch (err) {
      const errMsg = err.response?.data?.errors?.map(e => e.message).join(', ') || err.response?.data?.message || 'Failed to create ticket';
      toast.error(errMsg);
      logger.error('CreateTicket', 'handleSubmit', 'Ticket creation FAILED', err, { api: '/api/tickets', method: 'POST', status: err.response?.status, action: 'Ticket Create Failure' });
    } finally {
      setLoading(false);
    }
  };

  const handleTitleChange = (val) => {
    setForm(prev => {
      const next = { ...prev, title: val };
      const e = { ...errors };
      if (!val.trim()) {
        e.title = 'Title is required';
      } else if (val.length < 5 || val.length > 100) {
        e.title = 'Title must be 5–100 characters';
      } else if (!/^[a-zA-Z0-9\s.,!?()'\-]{5,100}$/.test(val)) {
        e.title = 'Title contains invalid characters';
      } else {
        delete e.title;
      }
      setErrors(e);
      return next;
    });
  };

  const handleDescChange = (val) => {
    setForm(prev => {
      const next = { ...prev, description: val };
      const e = { ...errors };
      if (!val.trim()) {
        e.description = 'Description is required';
      } else if (val.length < 5 || val.length > 2000) {
        e.description = 'Description must be 5–2000 characters';
      } else {
        delete e.description;
      }
      setErrors(e);
      return next;
    });
  };

  return (
    <div className="page-body fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Create Ticket</h1>
          <p className="page-subtitle">Describe your issue and we'll get back to you.</p>
        </div>
      </div>

      <div className="create-ticket-form bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl py-7 px-8 max-w-[680px] mx-auto">
        <h2 className="text-[#e4e4e4] mb-5">Create New Ticket</h2>
        <form onSubmit={handleSubmit}>
          <div className="field-group">
            <label>Title *</label>
            <input 
              className={errors.title ? 'input-error' : form.title ? 'input-success' : ''} 
              type="text" 
              placeholder="Brief summary of the issue (5-100 chars)" 
              value={form.title} 
              onChange={(e) => handleTitleChange(e.target.value)} 
            />
            {errors.title && <span className="error-msg block text-[11px] text-[var(--color-high)] mt-1">{errors.title}</span>}
            {form.title && !errors.title && <span className="success-msg block text-[11px] text-[var(--color-teal)] mt-1">✓ Title is valid</span>}
          </div>

          <div className="field-group">
            <label>Description *</label>
            <textarea 
              className={errors.description ? 'input-error' : form.description ? 'input-success' : ''} 
              placeholder="Describe the issue in detail (20-2000 chars)..." 
              value={form.description} 
              onChange={(e) => handleDescChange(e.target.value)} 
              className={`${errors.description ? 'input-error' : form.description ? 'input-success' : ''} min-h-[130px] resize-y`}
            />
            {errors.description && <span className="error-msg block text-[11px] text-[var(--color-high)] mt-1">{errors.description}</span>}
            {form.description && !errors.description && <span className="success-msg block text-[11px] text-[var(--color-teal)] mt-1">✓ Description is valid</span>}
          </div>

          <div className="field-group max-w-[320px]">
            <label>Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Attachments Section */}
          <div className="field-group mt-5">
            <label>Attachments (Max 20, 5MB each, JPG/PNG/WEBP/PDF only)</label>
            <div className="attachment-zone border-2 border-dashed border-[var(--color-border)] p-6 text-center rounded-lg cursor-pointer bg-[var(--color-surface)]" onClick={() => fileInputRef.current.click()}>
              <Paperclip size={24} className="text-[var(--color-text-muted)]" />
              <p className="text-[#acacac] mt-2">Click to browse or drag files here</p>
            </div>
            <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/jpeg,image/png,image/webp,application/pdf" />
            
            {files.length > 0 && (
              <div className="attachment-list flex gap-3 mt-3 flex-wrap">
                {files.map((file, i) => (
                  <div key={i} className="attachment-thumb relative flex items-center gap-2 p-2 bg-[var(--color-surface)] rounded-md border border-[var(--color-border)]">
                    {file.type.startsWith('image/') ? (
                      <img src={URL.createObjectURL(file)} alt="preview" className="w-8 h-8 rounded object-cover" />
                    ) : (
                      <Paperclip size={20} color="var(--color-text-muted)" />
                    )}
                    <div className="file-name text-xs max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap">{file.name}</div>
                    <button type="button" className="remove-btn bg-none border-none text-[#ff4444] cursor-pointer text-base px-1" onClick={(e) => { e.stopPropagation(); removeFile(i); }}>&times;</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <button type="submit" className="btn btn-primary py-2.5 px-6" disabled={loading}>
              {loading ? 'Submitting…' : 'Submit Ticket'}
            </button>
            <button type="button" className="btn btn-ghost py-2.5 px-6" onClick={() => navigate(-1)}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTicket;
