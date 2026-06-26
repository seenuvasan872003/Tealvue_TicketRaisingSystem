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
      try {
        const { data } = await getCategories();
        if (data && data.length > 0) {
          setCategories(['No Category', ...data]);
        }
      } catch (err) {
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
    
    // Check total files count (max 20)
    if (files.length + newFiles.length > 20) {
      toast.error('Maximum 20 attachments allowed');
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
    if (!validate()) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('category', form.category === 'No Category' ? '' : form.category);
      files.forEach(f => fd.append('attachments', f));

      const { data } = await createTicket(fd);
      toast.success('Ticket created successfully!');
      navigate(`/tickets/${data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create ticket');
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

      <div className="create-ticket-form" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '28px 32px', maxWidth: 680, margin: '0 auto' }}>
        <h2 style={{ color: '#e4e4e4', marginBottom: 20 }}>Create New Ticket</h2>
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
            {errors.title && <span className="error-msg" style={{ display: 'block', fontSize: 11, color: 'var(--color-high)', marginTop: 4 }}>{errors.title}</span>}
            {form.title && !errors.title && <span className="success-msg" style={{ display: 'block', fontSize: 11, color: 'var(--color-teal)', marginTop: 4 }}>✓ Title is valid</span>}
          </div>

          <div className="field-group">
            <label>Description *</label>
            <textarea 
              className={errors.description ? 'input-error' : form.description ? 'input-success' : ''} 
              placeholder="Describe the issue in detail (20-2000 chars)..." 
              value={form.description} 
              onChange={(e) => handleDescChange(e.target.value)} 
              style={{ minHeight: 130, resize: 'vertical' }} 
            />
            {errors.description && <span className="error-msg" style={{ display: 'block', fontSize: 11, color: 'var(--color-high)', marginTop: 4 }}>{errors.description}</span>}
            {form.description && !errors.description && <span className="success-msg" style={{ display: 'block', fontSize: 11, color: 'var(--color-teal)', marginTop: 4 }}>✓ Description is valid</span>}
          </div>

          <div className="field-group" style={{ maxWidth: 320 }}>
            <label>Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {categories.map((c) => <option key={c} value={c}>{c.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
            </select>
          </div>

          {/* Attachments Section */}
          <div className="field-group" style={{ marginTop: 20 }}>
            <label>Attachments (Max 20, 5MB each, JPG/PNG/WEBP/PDF only)</label>
            <div className="attachment-zone" onClick={() => fileInputRef.current.click()} style={{ border: '2px dashed var(--color-border)', padding: 24, textAlign: 'center', borderRadius: 8, cursor: 'pointer', background: 'var(--color-surface)' }}>
              <Paperclip size={24} style={{ color: 'var(--color-text-muted)' }} />
              <p style={{ color: '#acacac', marginTop: 8 }}>Click to browse or drag files here</p>
            </div>
            <input type="file" multiple ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} accept="image/jpeg,image/png,image/webp,application/pdf" />
            
            {files.length > 0 && (
              <div className="attachment-list" style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                {files.map((file, i) => (
                  <div key={i} className="attachment-thumb" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: 'var(--color-surface)', borderRadius: 6, border: '1px solid var(--color-border)' }}>
                    {file.type.startsWith('image/') ? (
                      <img src={URL.createObjectURL(file)} alt="preview" style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover' }} />
                    ) : (
                      <Paperclip size={20} color="var(--color-text-muted)" />
                    )}
                    <div className="file-name" style={{ fontSize: 12, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                    <button type="button" className="remove-btn" onClick={(e) => { e.stopPropagation(); removeFile(i); }} style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>&times;</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '10px 24px' }}>
              {loading ? 'Submitting…' : 'Submit Ticket'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)} style={{ padding: '10px 24px' }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTicket;
