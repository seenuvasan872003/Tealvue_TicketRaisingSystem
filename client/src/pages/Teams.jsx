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
import { useConfirm } from '../context/ConfirmContext';
import { SkeletonCard, SkeletonTable, SkeletonText } from '../components/skeletons';

import { getCache, setCache } from '../utils/cache';

const Teams = () => {
  const confirm = useConfirm();
  const [teams, setTeams] = useState(() => {
    const cached = getCache('teams_list');
    return Array.isArray(cached) ? cached : [];
  });
  const [loading, setLoading] = useState(() => {
    const cached = getCache('teams_list');
    return !Array.isArray(cached);
  });
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
    logger.info('Teams', 'fetchTeamsData', 'Loading teams data', { api: '/api/teams/dashboard', method: 'GET', action: 'Teams Load Start' });
    try {
      const cached = getCache('teams_list');
      if (!Array.isArray(cached) || cached.length === 0) {
        setLoading(true);
      }
      const { data } = await getTeamsDashboard();
      const list = data.teams || data || [];
      setTeams(list);
      setCache('teams_list', list, 15);
      logger.info('Teams', 'fetchTeamsData', `Teams loaded — ${list.length} teams`, { api: '/api/teams/dashboard', method: 'GET', status: 200, action: 'Teams Load Success' });
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
      if (val) {
        if (val.length < 8) {
          err = 'Password must be at least 8 characters';
        } else if (!/[A-Z]/.test(val)) {
          err = 'Must contain at least one uppercase letter (A-Z)';
        } else if (!/[0-9]/.test(val)) {
          err = 'Must contain at least one number (0-9)';
        } else if (!/[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]/.test(val)) {
          err = 'Must contain at least one special symbol (!@# etc.)';
        }
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
    const ok = await confirm('Are you sure you want to delete this team? All unresolved tickets must be completed first.', 'Delete Team');
    if (!ok) return;
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
      <div className="page-body fade-in">
        <div className="page-header flex justify-between items-center mb-6">
          <div className="flex flex-col gap-2 w-1/3">
            <SkeletonText height="24px" width="60%" />
            <SkeletonText height="14px" width="100%" />
          </div>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4 mb-6">
          <SkeletonCard height="90px" />
          <SkeletonCard height="90px" />
          <SkeletonCard height="90px" />
        </div>
        <SkeletonTable rows={4} columns={6} />
      </div>
    );
  }

  return (
    <>
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
      <div className="stat-grid mb-7">
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

      <div className="card p-0 overflow-hidden">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="min-w-[200px]">Team Name</th>
                <th className="min-w-[260px]">Team Admin</th>
                <th className="min-w-[200px]">Categories</th>
                <th className="min-w-[140px]">Members Count</th>
                <th className="min-w-[120px]">Status</th>
                <th className="min-w-[140px]">Tickets Handled</th>
                <th className="min-w-[100px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teams.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center p-6 text-[var(--color-text-muted)]">
                    No teams found.
                  </td>
                </tr>
              ) : (
                teams.map((team) => (
                  <tr key={team.teamId}>
                    <td>
                      <div className="font-semibold text-white">{team.name}</div>
                      <div className="text-[11px] text-[var(--color-text-muted)]">{team.description || 'No description'}</div>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-[6px]">
                          <Shield size={12} className="text-[var(--color-teal)]" />
                          <span className="font-semibold">{team.teamAdmin?.name || 'Unassigned'}</span>
                        </div>
                        {team.teamAdmin?.email && (
                          <div className="text-[11px] text-[var(--color-text-muted)] flex flex-col gap-0.5">
                            <div>Email: {team.teamAdmin.email}</div>
                            <div className="flex items-center gap-[6px]">
                              <span>Password:</span>
                              <span className="text-[#eac253] font-mono">
                                {team._showPw ? (team.teamAdminPassword || 'password123') : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTeams(prev => prev.map(t => t.teamId === team.teamId ? { ...t, _showPw: !t._showPw } : t));
                                }}
                                className="bg-transparent border-none p-0 text-[#888] cursor-pointer inline-flex items-center"
                              >
                                {team._showPw ? <EyeOff size={12} /> : <Eye size={12} />}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-1 flex-wrap">
                        {team.categories.map((cat, idx) => (
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
                      <div className="flex items-center gap-[6px]">
                        <Users size={14} className="text-[var(--color-text-muted)]" />
                        <span>{team.membersCount || 0} agents</span>
                      </div>
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleStatus(team)}
                        className={`bg-transparent border-none cursor-pointer flex items-center gap-[6px] text-xs ${team.isActive ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}
                      >
                        {team.isActive ? (
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
                    <td className="font-semibold">{team.total}</td>
                    <td>
                      <div className="flex gap-3">
                        <button
                          className="btn btn-ghost p-1.5"
                          onClick={() => openEditModal(team)}
                          title="Edit"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          className="btn btn-ghost p-1.5 text-[var(--color-error)]"
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

      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-[540px] h-[650px] max-h-[90vh] flex flex-col overflow-hidden">
            <div className="modal-header shrink-0 pt-5 px-7 pb-4 border-b border-[var(--color-border)]">
              <h3 className="m-0">{editingTeam ? 'Edit Team Details' : 'Add New Support Team'}</h3>
              <button onClick={() => setShowModal(false)} className="modal-close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
              <div className="modal-body overflow-y-auto flex-1 py-6 px-7">
                <div className="flex flex-col gap-4">
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
                    {errors.name && <span className="text-xs text-[#f87171] mt-1">{errors.name}</span>}
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
                    <div className="flex justify-between text-[11px] text-[var(--color-text-muted)] mt-1">
                      <span>{errors.description && <span className="text-[#f87171]">{errors.description}</span>}</span>
                      <span>{description.length}/500</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Auto-Allocation Support Categories *</label>
                    <div className="flex gap-2 flex-wrap mt-1.5 mb-3">
                      {categoryOptions.map((cat) => {
                        const isSelected = categories.includes(cat);
                        const isSuperAdminUser = window.localStorage.getItem('token') && JSON.parse(atob(window.localStorage.getItem('token').split('.')[1])).role === 'super-admin';
                        const defaultCategories = ['General', 'Technical', 'Billing', 'HR', 'Other'];
                        const isDeletable = isSuperAdminUser && !defaultCategories.includes(cat);
                        return (
                          <div 
                            key={cat} 
                            className={`flex items-center gap-0.5 rounded-md ${isDeletable ? 'pr-1' : 'pr-0'}`} 
                            style={{ 
                              background: isSelected ? 'var(--color-teal-dark)' : 'var(--color-surface)', 
                              border: isSelected ? '1px solid var(--color-teal)' : '1px solid var(--color-border)' 
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => handleCategoryToggle(cat)}
                              className="py-1.5 px-3 bg-transparent border-none text-white cursor-pointer text-xs transition-all duration-200"
                            >
                              {cat}
                            </button>
                            {isDeletable && (
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const ok = await confirm(`Delete category "${cat}"?`, 'Delete Category');
                                  if (ok) {
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
                                className="bg-transparent border-none text-[#f87171] cursor-pointer py-0.5 px-1.5 flex items-center"
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
                        className="py-1.5 px-3 rounded-md border border-[var(--color-teal)] bg-[rgba(20,160,125,0.1)] text-[var(--color-teal)] cursor-pointer text-xs font-semibold"
                      >
                        Add Custom
                      </button>
                    </div>
                  </div>

                  {/* Only show Team Admin creation fields for New Team */}
                  {!editingTeam && (
                    <div className="p-3.5 bg-[#222] rounded-lg border border-[#333] flex flex-col gap-3">
                      <h4 className="m-0 text-[13px] text-[var(--color-teal)] flex items-center gap-[6px]">
                        <Shield size={14} /> Create Team Admin Account
                      </h4>
                      <p className="text-[11px] text-[var(--color-text-muted)] m-0">This creates the admin user who will manage and allocate this team's tickets.</p>
                      
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
                        {errors.adminName && <span className="text-[11px] text-[#f87171] mt-1">{errors.adminName}</span>}
                      </div>

                      <div className="form-group">
                        <label>Admin Email *</label>
                        <input
                          type="email"
                          className="form-control"
                          value={adminEmail}
                          onChange={(e) => handleFieldChange('adminEmail', e.target.value)}
                          placeholder="e.g. techadmin@tealvue.com"
                          autoComplete="new-email"
                          required
                        />
                        {errors.adminEmail && <span className="text-[11px] text-[#f87171] mt-1">{errors.adminEmail}</span>}
                      </div>

                      <div className="form-group">
                        <label>Password *</label>
                        <div className="relative">
                          <input
                            type={showAdminPassword ? "text" : "password"}
                            className="form-control w-full pr-10"
                            value={adminPassword}
                            onChange={(e) => handleFieldChange('adminPassword', e.target.value)}
                            placeholder="At least 6 characters"
                            autoComplete="new-password"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowAdminPassword(!showAdminPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-[#888] cursor-pointer flex items-center justify-center"
                          >
                            {showAdminPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        {errors.adminPassword && <span className="text-[11px] text-[#f87171] mt-1">{errors.adminPassword}</span>}
                        <div className="mt-1.5 p-2 bg-[#161b22] rounded-md border border-[var(--color-border)]">
                          <div className="text-[11px] font-semibold text-[var(--color-text-muted)] mb-1">Password Requirements:</div>
                          <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-[10px]">
                            <span className={adminPassword.length >= 8 ? 'text-[var(--color-teal)]' : 'text-[#acacac]'}>
                              {adminPassword.length >= 8 ? '✓' : '•'} Min 8 chars
                            </span>
                            <span className={/[A-Z]/.test(adminPassword) ? 'text-[var(--color-teal)]' : 'text-[#acacac]'}>
                              {/[A-Z]/.test(adminPassword) ? '✓' : '•'} 1 Uppercase (A-Z)
                            </span>
                            <span className={/[0-9]/.test(adminPassword) ? 'text-[var(--color-teal)]' : 'text-[#acacac]'}>
                              {/[0-9]/.test(adminPassword) ? '✓' : '•'} 1 Number (0-9)
                            </span>
                            <span className={/[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]/.test(adminPassword) ? 'text-[var(--color-teal)]' : 'text-[#acacac]'}>
                              {/[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]/.test(adminPassword) ? '✓' : '•'} 1 Special symbol
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="!w-auto h-4"
                    />
                    <label htmlFor="isActive" className="cursor-pointer">Active and accepting ticket allocations</label>
                  </div>
                </div>
              </div>

              <div className="modal-footer shrink-0 py-4 px-7 border-t border-[var(--color-border)] flex justify-end gap-3 bg-[rgba(255,255,255,0.01)]">
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
    </>
  );
};

export default Teams;
