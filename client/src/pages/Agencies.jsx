import { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  X,
} from 'lucide-react';
import {
  createAgency,
  updateAgency,
  deleteAgency,
  getAgenciesDashboard,
  getCategories,
} from '../services/ticketApi';
import { toast } from 'react-toastify';
import logger from '../utils/logger';

const Agencies = () => {
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAgency, setEditingAgency] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState([]);
  const [isActive, setIsActive] = useState(true);

  // Validation Errors
  const [errors, setErrors] = useState({});

  const [categoryOptions, setCategoryOptions] = useState(['General', 'Technical', 'Billing', 'HR', 'Other']);
  const [customCategory, setCustomCategory] = useState('');

  const fetchAgenciesData = async () => {
    logger.info('Agencies', 'fetchAgenciesData', 'Loading agencies dashboard data', { api: '/api/agencies', method: 'GET', action: 'Agencies Load Start' });
    try {
      setLoading(true);
      const { data } = await getAgenciesDashboard();
      setAgencies(data.agencies || data);
      logger.info('Agencies', 'fetchAgenciesData', `Agencies loaded — ${(data.agencies || data || []).length} agencies`, { api: '/api/agencies', method: 'GET', status: 200, action: 'Agencies Load Success' });
    } catch (err) {
      logger.error('Agencies', 'fetchAgenciesData', 'Failed to load agencies', err, { api: '/api/agencies', method: 'GET', action: 'Agencies Load Failure' });
      console.error(err);
      toast.error('Failed to load agencies');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const { data } = await getCategories();
      if (data && data.length > 0) {
        setCategoryOptions(data);
      }
    } catch (err) {
      console.error('[Agencies] Failed to load categories:', err);
    }
  };

  useEffect(() => {
    fetchAgenciesData();
    loadCategories();
  }, []);

  const validateField = (field, val) => {
    let err = null;
    if (field === 'name') {
      if (!/^[a-zA-Z\s-]{2,50}$/.test(val)) {
        err = 'Name: 2–50 letters only, no numbers/special chars';
      }
    }
    if (field === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        err = 'Enter a valid email address';
      }
    }
    if (field === 'phone') {
      if (val && !/^[0-9]{7,15}$/.test(val)) {
        err = 'Phone: 7–15 digits only';
      }
    }
    if (field === 'description') {
      if (val && val.length > 500) {
        err = 'Description cannot exceed 500 characters';
      }
    }
    return err;
  };

  const handleFieldChange = (field, val) => {
    if (field === 'name') setName(val);
    if (field === 'email') setEmail(val);
    if (field === 'phone') setPhone(val);
    if (field === 'description') setDescription(val);

    const err = validateField(field, val);
    setErrors((prev) => ({
      ...prev,
      [field]: err,
    }));
  };

  const handleCategoryToggle = (cat) => {
    if (categories.includes(cat)) {
      setCategories(categories.filter((c) => c !== cat));
    } else {
      setCategories([...categories, cat]);
    }
  };

  const openAddModal = () => {
    setEditingAgency(null);
    setName('');
    setEmail('');
    setPhone('');
    setDescription('');
    setCategories([]);
    setIsActive(true);
    setErrors({});
    setShowModal(true);
  };

  const openEditModal = (agency) => {
    setEditingAgency(agency);
    setName(agency.name);
    setEmail(agency.email);
    setPhone(agency.phone || '');
    setDescription(agency.description || '');
    setCategories(agency.categories || []);
    setIsActive(agency.isActive);
    setErrors({});
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    // Run all validations
    const nameErr = validateField('name', name);
    const emailErr = validateField('email', email);
    const phoneErr = validateField('phone', phone);
    const descErr = validateField('description', description);

    if (nameErr || emailErr || phoneErr || descErr) {
      setErrors({
        name: nameErr,
        email: emailErr,
        phone: phoneErr,
        description: descErr,
      });
      toast.error('Please fix the validation errors.');
      return;
    }

    if (categories.length === 0) {
      toast.error('Please select at least one category.');
      return;
    }

    const payload = { name, email, phone, description, categories, isActive };

    try {
      if (editingAgency) {
        await updateAgency(editingAgency.agencyId, payload);
        toast.success('Agency updated successfully');
      } else {
        await createAgency(payload);
        toast.success('Agency created successfully');
      }
      setShowModal(false);
      fetchAgenciesData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving agency');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this agency?')) return;
    try {
      await deleteAgency(id);
      toast.success('Agency deleted successfully');
      fetchAgenciesData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete agency');
    }
  };

  const handleToggleStatus = async (agency) => {
    try {
      await updateAgency(agency.agencyId, { isActive: !agency.isActive });
      toast.success(`Agency status updated`);
      fetchAgenciesData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update agency status');
    }
  };

  // Stat calculations
  const totalAgencies = agencies.length;
  const activeAgencies = agencies.filter((a) => a.isActive).length;
  const totalHandled = agencies.reduce((acc, curr) => acc + (curr.total || 0), 0);

  if (loading && agencies.length === 0) {
    return (
      <div className="p-[60px] text-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page-body fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Agency Management</h1>
          <p className="page-subtitle">Configure system support agencies and their target categories.</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={15} /> Add Agency
        </button>
      </div>

      {/* Stats row */}
      <div className="stat-grid mb-7">
        <div className="stat-card teal">
          <div className="stat-label">Total Agencies</div>
          <div className="stat-value">{totalAgencies}</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Active Agencies</div>
          <div className="stat-value">{activeAgencies}</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-label">Total Handled Tickets</div>
          <div className="stat-value">{totalHandled}</div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Agency Name</th>
                <th>Categories</th>
                <th>Status</th>
                <th>Tickets Handled</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {agencies.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center p-6 text-[var(--color-text-muted)]">
                    No agencies found.
                  </td>
                </tr>
              ) : (
                agencies.map((agency) => (
                  <tr key={agency.agencyId}>
                    <td>
                      <div className="font-semibold">{agency.name}</div>
                      <div className="text-[11px] text-[var(--color-text-muted)]">{agency.email}</div>
                    </td>
                    <td>
                      <div className="flex gap-1 flex-wrap">
                        {agency.categories.map((cat, idx) => (
                          <span
                            key={idx}
                            className="py-0.5 px-2 text-[10px] rounded bg-[var(--color-border)] text-[var(--color-text)]"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleStatus(agency)}
                        className={`bg-none border-none cursor-pointer flex items-center gap-1.5 text-xs ${agency.isActive ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}
                      >
                        {agency.isActive ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-[var(--color-success)]" />
                            Active
                          </>
                        ) : (
                          <>
                            <span className="w-2 h-2 rounded-full bg-[var(--color-error)]" />
                            Inactive
                          </>
                        )}
                      </button>
                    </td>
                    <td className="font-semibold">{agency.total}</td>
                    <td>
                      <div className="flex gap-3">
                        <button
                          className="btn btn-ghost"
                          className="btn btn-ghost p-1.5"
                          onClick={() => openEditModal(agency)}
                          title="Edit"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          className="btn btn-ghost"
                          className="btn btn-ghost p-1.5 text-[var(--color-error)]"
                          onClick={() => handleDelete(agency.agencyId)}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-[500px] max-h-[85vh] flex flex-col overflow-hidden">
            <div className="modal-header shrink-0 py-4 px-5 border-b border-[var(--color-border)]">
              <h3 className="m-0">{editingAgency ? 'Edit Agency' : 'Add New Agency'}</h3>
              <button onClick={() => setShowModal(false)} className="modal-close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} className="flex flex-col gap-4 overflow-y-auto flex-1 p-5">
              <div className="form-group">
                <label>Agency Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  placeholder="e.g. TechCare Agency"
                  required
                />
                {errors.name && <span className="text-xs text-[#f87171] mt-1">{errors.name}</span>}
              </div>

              <div className="form-group">
                <label>Agency Email *</label>
                <input
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  placeholder="e.g. support@agency.com"
                  required
                />
                {errors.email && <span className="text-xs text-[#f87171] mt-1">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="text"
                  className="form-control"
                  value={phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  placeholder="e.g. 1234567890"
                />
                {errors.phone && <span className="text-xs text-[#f87171] mt-1">{errors.phone}</span>}
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  placeholder="Describe the agency's primary responsibilities..."
                />
                <div className="flex justify-between text-[11px] text-[var(--color-text-muted)] mt-1">
                  <span>{errors.description && <span className="text-[#f87171]">{errors.description}</span>}</span>
                  <span>{description.length}/500</span>
                </div>
              </div>

              <div className="form-group">
                <label>Support Categories *</label>
                <div className="flex gap-2 flex-wrap mt-1.5 mb-3">
                  {categoryOptions.map((cat) => {
                    const isSelected = categories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleCategoryToggle(cat)}
                        className={`py-1.5 px-3 rounded-md text-white cursor-pointer text-xs transition-all duration-200 ${isSelected ? 'border border-[var(--color-teal)] bg-[var(--color-teal-dark)]' : 'border border-[var(--color-border)] bg-[var(--color-surface)]'}`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>

                {/* Add Custom Category Input */}
                <div className="flex gap-2 items-center mt-2">
                  <input
                    type="text"
                    placeholder="Enter new custom category..."
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="flex-1 py-1.5 px-2.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-white text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = customCategory.trim();
                      if (!trimmed) return;
                      // Capitalize first letter of each word for neatness
                      const capitalized = trimmed.replace(/\b\w/g, l => l.toUpperCase());
                      
                      // Add to options if not already present
                      if (!categoryOptions.includes(capitalized)) {
                        setCategoryOptions([...categoryOptions, capitalized]);
                      }
                      
                      // Auto-select it
                      if (!categories.includes(capitalized)) {
                        setCategories([...categories, capitalized]);
                      }
                      
                      setCustomCategory('');
                      toast.success(`Category "${capitalized}" added and selected`);
                    }}
                    className="py-1.5 px-3 rounded-md border border-[var(--color-teal)] bg-[rgba(20,160,125,0.1)] text-[var(--color-teal)] cursor-pointer text-xs font-semibold"
                  >
                    Add Custom
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="isActive" className="cursor-pointer">Active and accepting assignments</label>
              </div>

              <div className="flex justify-end gap-3 mt-3.5">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Agency
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Agencies;
