import { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  X,
  Users,
  User,
  Shield,
  Briefcase,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamsDashboard,
  getCategories,
} from '../services/ticketApi';
import { toast } from 'react-toastify';
import logger from '../utils/logger';

const Teams = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState([]);
  const [isActive, setIsActive] = useState(true);

  // Team Admin Credentials Form State (Required for new Team creation)
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Validation Errors
  const [errors, setErrors] = useState({});

  const [categoryOptions, setCategoryOptions] = useState(['General', 'Technical', 'Billing', 'HR', 'Other']);
  const [customCategory, setCustomCategory] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const fetchTeamsData = async () => {
    logger.info('Teams', 'fetchTeamsData', 'Loading teams dashboard data', { api: '/api/teams/dashboard', method: 'GET', action: 'Teams Load Start' });
    try {
      setLoading(true);
      const { data } = await getTeamsDashboard();
      setTeams(data.teams || data);
      logger.info('Teams', 'fetchTeamsData', `Teams loaded — ${(data.teams || data || []).length} teams`, { api: '/api/teams/dashboard', method: 'GET', status: 200, action: 'Teams Load Success' });
    } catch (err) {
      logger.error('Teams', 'fetchTeamsData', 'Failed to load teams', err, { api: '/api/teams/dashboard', method: 'GET', action: 'Teams Load Failure' });
      console.error(err);
      toast.error('Failed to load teams');
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
      console.error('[Teams] Failed to load categories:', err);
    }
  };

  useEffect(() => {
    fetchTeamsData();
    loadCategories();
  }, []);

  const validateField = (field, val) => {
    let err = null;
    if (field === 'name') {
      if (!/^[a-zA-Z0-9\s-]{2,50}$/.test(val)) {
        err = 'Name: 2–50 characters, letters/numbers/spaces/hyphens only';
      }
    }
    if (field === 'adminEmail') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        err = 'Enter a valid email address';
      }
    }
    if (field === 'adminPassword') {
      if (val && val.length < 6) {
        err = 'Password must be at least 6 characters';
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
    if (field === 'description') setDescription(val);
    if (field === 'adminName') setAdminName(val);
    if (field === 'adminEmail') setAdminEmail(val);
    if (field === 'adminPassword') setAdminPassword(val);

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
    setEditingTeam(null);
    setName('');
    setDescription('');
    setCategories([]);
    setIsActive(true);
    setAdminName('');
    setAdminEmail('');
    setAdminPassword('');
    setErrors({});
    setShowModal(true);
  };

  const openEditModal = (team) => {
    setEditingTeam(team);
    setName(team.name);
    setDescription(team.description || '');
    setCategories(team.categories || []);
    setIsActive(team.isActive);
    setErrors({});
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    // Run all validations
    const nameErr = validateField('name', name);
    const descErr = validateField('description', description);

    let adminNameErr = null;
    let adminEmailErr = null;
    let adminPasswordErr = null;

    if (!editingTeam) {
      if (!adminName.trim()) adminNameErr = 'Admin Name is required';
      adminEmailErr = validateField('adminEmail', adminEmail);
      if (!adminPassword) adminPasswordErr = 'Admin Password is required';
      else adminPasswordErr = validateField('adminPassword', adminPassword);
    }

    if (nameErr || descErr || adminNameErr || adminEmailErr || adminPasswordErr) {
      setErrors({
        name: nameErr,
        description: descErr,
        adminName: adminNameErr,
        adminEmail: adminEmailErr,
        adminPassword: adminPasswordErr,
      });
      toast.error('Please fix the validation errors.');
      return;
    }

    if (categories.length === 0) {
      toast.error('Please select at least one category.');
      return;
    }

    try {
      if (editingTeam) {
        const payload = { name, description, categories, isActive };
        await updateTeam(editingTeam.teamId, payload);
        toast.success('Team updated successfully');
        logger.info('Teams', 'handleSave', `Team updated: ${name}`, { api: `/api/teams/${editingTeam.teamId}`, method: 'PUT', status: 200, action: 'Team Update Success' });
      } else {
        const payload = {
          name,
          description,
          categories,
          teamAdminName: adminName,
          teamAdminEmail: adminEmail,
          teamAdminPassword: adminPassword,
        };
        await createTeam(payload);
        toast.success('Team and Team Admin account created successfully');
        logger.info('Teams', 'handleSave', `Team created: ${name}`, { api: '/api/teams', method: 'POST', status: 201, action: 'Team Create Success' });
      }
      setShowModal(false);
      fetchTeamsData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving team');
      logger.error('Teams', 'handleSave', 'Team save FAILED', err, { api: '/api/teams', method: editingTeam ? 'PUT' : 'POST', status: err.response?.status, action: 'Team Save Failure' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this team? All unresolved tickets must be completed first.')) return;
    logger.info('Teams', 'handleDelete', `Deleting team: ${id}`, { api: `/api/teams/${id}`, method: 'DELETE', action: 'Team Delete Attempt' });
    try {
      await deleteTeam(id);
      toast.success('Team deleted successfully');
      logger.info('Teams', 'handleDelete', 'Team deleted successfully', { api: `/api/teams/${id}`, method: 'DELETE', status: 200, action: 'Team Delete Success' });
      fetchTeamsData();
    } catch (err) {
      logger.error('Teams', 'handleDelete', 'Failed to delete team', err, { api: `/api/teams/${id}`, method: 'DELETE', status: err.response?.status, action: 'Team Delete Failure' });
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to delete team');
    }
  };

  const handleToggleStatus = async (team) => {
    try {
      await updateTeam(team.teamId, { isActive: !team.isActive });
      toast.success(`Team status updated`);
      fetchTeamsData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update team status');
    }
  };

  // Stat calculations
  const totalTeams = teams.length;
  const activeTeams = teams.filter((t) => t.isActive).length;
  const totalHandled = teams.reduce((acc, curr) => acc + (curr.total || 0), 0);

  if (loading && teams.length === 0) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page-body fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Team Management</h1>
          <p className="page-subtitle">Configure specialized teams, auto-allocation categories, and Team Admins.</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={15} /> Add Team
        </button>
      </div>

      {/* Stats row */}
      <div className="stat-grid" style={{ marginBottom: 28 }}>
        <div className="stat-card teal">
          <div className="stat-label">Total Teams</div>
          <div className="stat-value">{totalTeams}</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Active Teams</div>
          <div className="stat-value">{activeTeams}</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-label">Total Handled Tickets</div>
          <div className="stat-value">{totalHandled}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Team Name</th>
                <th>Team Admin</th>
                <th>Categories</th>
                <th>Members Count</th>
                <th>Status</th>
                <th>Tickets Handled</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teams.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-muted)' }}>
                    No teams found.
                  </td>
                </tr>
              ) : (
                teams.map((team) => (
                  <tr key={team.teamId}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#fff' }}>{team.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{team.description || 'No description'}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Shield size={12} className="text-teal" style={{ color: 'var(--color-teal)' }} />
                          <span style={{ fontWeight: 600 }}>{team.teamAdmin?.name || 'Unassigned'}</span>
                        </div>
                        {team.teamAdmin?.email && (
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <div>Email: {team.teamAdmin.email}</div>
                            <div>Password: <span style={{ color: '#eac253', fontFamily: 'monospace' }}>{team.teamAdminPassword || 'password123'}</span></div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {team.categories.map((cat, idx) => (
                          <span
                            key={idx}
                            style={{
                              padding: '2px 8px',
                              fontSize: 10,
                              borderRadius: 4,
                              background: 'var(--color-border)',
                              color: 'var(--color-text)',
                            }}
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Users size={14} style={{ color: 'var(--color-text-muted)' }} />
                        <span>{team.membersCount || 0} agents</span>
                      </div>
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleStatus(team)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 12,
                          color: team.isActive ? 'var(--color-success)' : 'var(--color-error)',
                        }}
                      >
                        {team.isActive ? (
                          <>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-success)' }} />
                            Active
                          </>
                        ) : (
                          <>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-error)' }} />
                            Inactive
                          </>
                        )}
                      </button>
                    </td>
                    <td style={{ fontWeight: 600 }}>{team.total}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: 6 }}
                          onClick={() => openEditModal(team)}
                          title="Edit"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: 6, color: 'var(--color-error)' }}
                          onClick={() => handleDelete(team.teamId)}
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
          <div className="modal-content" style={{ maxWidth: 540, height: 650, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="modal-header" style={{ flexShrink: 0, padding: '20px 28px 16px 28px', borderBottom: '1px solid var(--color-border)' }}>
              <h3 style={{ margin: 0 }}>{editingTeam ? 'Edit Team Details' : 'Add New Support Team'}</h3>
              <button onClick={() => setShowModal(false)} className="modal-close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: '24px 28px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-group">
                    <label>Team Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={name}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                      placeholder="e.g. Technical Support Team"
                      required
                    />
                    {errors.name && <span style={{ fontSize: 12, color: '#f87171', marginTop: 4 }}>{errors.name}</span>}
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      value={description}
                      onChange={(e) => handleFieldChange('description', e.target.value)}
                      placeholder="Describe this team's primary role..."
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                      <span>{errors.description && <span style={{ color: '#f87171' }}>{errors.description}</span>}</span>
                      <span>{description.length}/500</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Auto-Allocation Support Categories *</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6, marginBottom: 12 }}>
                      {categoryOptions.map((cat) => {
                        const isSelected = categories.includes(cat);
                        const isSuperAdminUser = window.localStorage.getItem('token') && JSON.parse(atob(window.localStorage.getItem('token').split('.')[1])).role === 'super-admin';
                        const defaultCategories = ['General', 'Technical', 'Billing', 'HR', 'Other'];
                        const isDeletable = isSuperAdminUser && !defaultCategories.includes(cat);
                        return (
                          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 2, background: isSelected ? 'var(--color-teal-dark)' : 'var(--color-surface)', border: isSelected ? '1px solid var(--color-teal)' : '1px solid var(--color-border)', borderRadius: 6, paddingRight: isDeletable ? 4 : 0 }}>
                            <button
                              type="button"
                              onClick={() => handleCategoryToggle(cat)}
                              style={{
                                padding: '6px 12px',
                                background: 'transparent',
                                border: 'none',
                                color: '#fff',
                                cursor: 'pointer',
                                fontSize: 12,
                                transition: 'all 0.2s',
                              }}
                            >
                              {cat}
                            </button>
                            {isDeletable && (
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`Delete category "${cat}"?`)) {
                                    try {
                                      // Call API to delete category if endpoint exists or filter local options
                                      setCategoryOptions(prev => prev.filter(c => c !== cat));
                                      setCategories(prev => prev.filter(c => c !== cat));
                                      toast.success(`Category "${cat}" removed`);
                                    } catch (err) {
                                      toast.error('Failed to delete category');
                                    }
                                  }
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#f87171',
                                  cursor: 'pointer',
                                  padding: '2px 6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                }}
                                title="Delete Category"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Add Custom Category Input */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                      <input
                        type="text"
                        placeholder="Enter new custom category..."
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '6px 10px',
                          borderRadius: 6,
                          border: '1px solid var(--color-border)',
                          background: 'var(--color-surface)',
                          color: '#fff',
                          fontSize: 12,
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const trimmed = customCategory.trim();
                          if (!trimmed) return;
                          const capitalized = trimmed.replace(/\b\w/g, l => l.toUpperCase());
                          if (!categoryOptions.includes(capitalized)) {
                            setCategoryOptions([...categoryOptions, capitalized]);
                          }
                          if (!categories.includes(capitalized)) {
                            setCategories([...categories, capitalized]);
                          }
                          setCustomCategory('');
                          toast.success(`Category "${capitalized}" added and selected`);
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          border: '1px solid var(--color-teal)',
                          background: 'rgba(20,160,125,0.1)',
                          color: 'var(--color-teal)',
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        Add Custom
                      </button>
                    </div>
                  </div>

                  {/* Only show Team Admin creation fields for New Team */}
                  {!editingTeam && (
                    <div style={{ padding: 14, background: '#222', borderRadius: 8, border: '1px solid #333', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <h4 style={{ margin: 0, fontSize: 13, color: 'var(--color-teal)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Shield size={14} /> Create Team Admin Account
                      </h4>
                      <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>This creates the admin user who will manage and allocate this team's tickets.</p>
                      
                      <div className="form-group">
                        <label>Admin Name *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={adminName}
                          onChange={(e) => handleFieldChange('adminName', e.target.value)}
                          placeholder="e.g. John Doe"
                          required
                        />
                        {errors.adminName && <span style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>{errors.adminName}</span>}
                      </div>

                      <div className="form-group">
                        <label>Admin Email *</label>
                        <input
                          type="email"
                          className="form-control"
                          value={adminEmail}
                          onChange={(e) => handleFieldChange('adminEmail', e.target.value)}
                          placeholder="e.g. techadmin@tealvue.com"
                          required
                        />
                        {errors.adminEmail && <span style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>{errors.adminEmail}</span>}
                      </div>

                      <div className="form-group">
                        <label>Password *</label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showAdminPassword ? "text" : "password"}
                            className="form-control"
                            value={adminPassword}
                            onChange={(e) => handleFieldChange('adminPassword', e.target.value)}
                            placeholder="At least 6 characters"
                            style={{ width: '100%', paddingRight: 40 }}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowAdminPassword(!showAdminPassword)}
                            style={{
                              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                              background: 'none', border: 'none', color: '#888', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                          >
                            {showAdminPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        {errors.adminPassword && <span style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>{errors.adminPassword}</span>}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      style={{ width: 16, height: 16 }}
                    />
                    <label htmlFor="isActive" style={{ cursor: 'pointer' }}>Active and accepting ticket allocations</label>
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ flexShrink: 0, padding: '16px 28px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: 12, background: 'rgba(255,255,255,0.01)' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingTeam ? 'Save Team' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Teams;
