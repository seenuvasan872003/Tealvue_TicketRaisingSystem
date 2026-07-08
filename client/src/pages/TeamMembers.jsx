import { useState, useEffect } from 'react';
import { getMyTeam, getTeamMembers, addTeamMember, deleteTeamMember } from '../services/ticketApi';
import { toast } from 'react-toastify';
import { Plus, Trash2, X, Users, User, ShieldAlert, Mail } from 'lucide-react';
import logger from '../utils/logger';
import { useConfirm } from '../context/ConfirmContext';
import { SkeletonCard, SkeletonTable, SkeletonText } from '../components/skeletons';

import { getCache, setCache } from '../utils/cache';

const TeamMembers = () => {
  const confirm = useConfirm();
  const [team, setTeam] = useState(() => getCache('my_team'));
  const [members, setMembers] = useState(() => {
    const cached = getCache('team_members');
    return Array.isArray(cached) ? cached : [];
  });
  const [loading, setLoading] = useState(() => !getCache('my_team'));
  const [showModal, setShowModal] = useState(false);

  // Form State for new member
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});

  const loadTeamAndMembers = async () => {
    logger.info('TeamMembers', 'loadTeamAndMembers', 'Loading team and members data', { action: 'Team Members Load Start' });
    try {
      const cachedTeam = getCache('my_team');
      if (!cachedTeam) {
        setLoading(true);
      }
      const teamRes = await getMyTeam();
      setTeam(teamRes.data);
      setCache('my_team', teamRes.data, 15);

      const membersRes = await getTeamMembers(teamRes.data._id);
      const list = membersRes.data || [];
      setMembers(list);
      setCache('team_members', list, 15);
      logger.info('TeamMembers', 'loadTeamAndMembers', `Team members loaded — team: ${teamRes.data.name} | ${list.length} member(s)`, {
        api: `/api/teams/${teamRes.data._id}/members`, method: 'GET', action: 'Team Members Load Success',
      });
    } catch (err) {
      logger.error('TeamMembers', 'loadTeamAndMembers', 'Failed to load team members', err, {
        api: '/api/teams/mine', method: 'GET', action: 'Team Members Load Failure',
      });
      console.error(err);
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeamAndMembers();
  }, []);

  const openAddModal = () => {
    setName('');
    setEmail('');
    setPassword('');
    setErrors({});
    setShowModal(true);
  };

  const handleAddMember = async (e) => {
    e.preventDefault();

    // Validation
    const err = {};
    if (!name.trim()) err.name = 'Name is required';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      err.email = 'Valid email is required';
    }
    if (!password || password.length < 6) {
      err.password = 'Password must be at least 6 characters';
    }

    if (Object.keys(err).length > 0) {
      setErrors(err);
      return;
    }

    try {
      await addTeamMember(team._id, { name, email, password });
      toast.success('Team agent created and added successfully!');
      logger.info('TeamMembers', 'handleAddMember', `Team agent added — email: ${email}`, {
        api: `/api/teams/${team._id}/members`, method: 'POST', status: 201, action: 'Team Member Add Success',
      });
      setShowModal(false);
      loadTeamAndMembers();
    } catch (err) {
      logger.error('TeamMembers', 'handleAddMember', 'Failed to add team member', err, {
        api: `/api/teams/${team._id}/members`, method: 'POST', status: err.response?.status, action: 'Team Member Add Failure',
      });
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to add team member');
    }
  };

  const handleDeleteMember = async (memberId) => {
    const ok = await confirm('Are you sure you want to remove this member from the team?', 'Remove Member');
    if (!ok) return;
    logger.info('TeamMembers', 'handleDeleteMember', `Removing member: ${memberId}`, { action: 'Team Member Delete Attempt' });
    try {
      await deleteTeamMember(team._id, memberId);
      toast.success('Member removed from team successfully');
      logger.info('TeamMembers', 'handleDeleteMember', 'Team member removed successfully', {
        api: `/api/teams/${team._id}/members/${memberId}`, method: 'DELETE', action: 'Team Member Delete Success',
      });
      loadTeamAndMembers();
    } catch (err) {
      logger.error('TeamMembers', 'handleDeleteMember', 'Failed to remove member', err, {
        api: `/api/teams/${team._id}/members/${memberId}`, method: 'DELETE', status: err.response?.status, action: 'Team Member Delete Failure',
      });
      console.error(err);
      toast.error('Failed to remove member');
    }
  };

  if (loading && !team) {
    return (
      <div className="page-body fade-in">
        <div className="page-header flex justify-between items-center mb-6">
          <div className="flex flex-col gap-2 w-1/3">
            <SkeletonText height="24px" width="60%" />
            <SkeletonText height="14px" width="100%" />
          </div>
        </div>
        <SkeletonTable rows={4} columns={7} />
      </div>
    );
  }

  return (
    <div className="page-body fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Team Members</h1>
          <p className="page-subtitle">Manage agents and check workload of the <strong>{team?.name || 'Support'}</strong> team.</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={15} /> Add Agent
        </button>
      </div>

      {/* Members Grid/List */}
      <div className="card p-0 overflow-hidden">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Joined Date</th>
                <th>Assigned Tickets</th>
                <th>Closed Tickets</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center p-6 text-[var(--color-text-muted)]">
                    No members added to this team yet.
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member._id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-teal-dark)] to-[var(--color-teal)] text-white flex items-center justify-center text-xs font-bold">
                          {member.name?.[0]?.toUpperCase()}
                        </div>
                        <span className="font-semibold text-white">{member.name}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-[6px]">
                        <Mail size={13} className="text-[var(--color-text-muted)]" />
                        <span>{member.email}</span>
                      </div>
                    </td>
                    <td>{new Date(member.createdAt).toLocaleDateString()}</td>
                    <td className="font-semibold">{member.assignedCount || 0}</td>
                    <td className="font-semibold text-[var(--color-success)]">{member.closedCount || 0}</td>
                    <td>
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${member.isActive ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${member.isActive ? 'bg-[var(--color-success)]' : 'bg-[var(--color-error)]'}`} />
                        {member.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost p-1.5 text-[var(--color-error)]"
                        onClick={() => handleDeleteMember(member._id)}
                        title="Remove member"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Member Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-[450px]">
            <div className="modal-header">
              <h3>Add Team Agent</h3>
              <button onClick={() => setShowModal(false)} className="modal-close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddMember} className="flex flex-col gap-4 px-7 pb-7">
              <div className="form-group">
                <label>Agent Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={name}
                  onChange={(e) => { setName(e.target.value); if (errors.name) setErrors({ ...errors, name: '' }); }}
                  placeholder="e.g. Alice Smith"
                  required
                />
                {errors.name && <span className="text-xs text-[#f87171] mt-1">{errors.name}</span>}
              </div>

              <div className="form-group">
                <label>Agent Email *</label>
                <input
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors({ ...errors, email: '' }); }}
                  placeholder="e.g. alice@tealvue.com"
                  required
                />
                {errors.email && <span className="text-xs text-[#f87171] mt-1">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors({ ...errors, password: '' }); }}
                  placeholder="At least 6 characters"
                  required
                />
                {errors.password && <span className="text-xs text-[#f87171] mt-1">{errors.password}</span>}
              </div>

              <div className="flex justify-end gap-3 mt-3.5">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamMembers;
