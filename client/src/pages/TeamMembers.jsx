import { useState, useEffect } from 'react';
import { getMyTeam, getTeamMembers, addTeamMember, deleteTeamMember } from '../services/ticketApi';
import { toast } from 'react-toastify';
import { Plus, Trash2, X, Users, User, ShieldAlert, Mail } from 'lucide-react';
import logger from '../utils/logger';

const TeamMembers = () => {
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State for new member
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});

  const loadTeamAndMembers = async () => {
    logger.info('TeamMembers', 'loadTeamAndMembers', 'Loading team and members data', { action: 'Team Members Load Start' });
    try {
      setLoading(true);
      const teamRes = await getMyTeam();
      setTeam(teamRes.data);

      const membersRes = await getTeamMembers(teamRes.data._id);
      setMembers(membersRes.data || []);
      logger.info('TeamMembers', 'loadTeamAndMembers', `Team members loaded — team: ${teamRes.data.name} | ${(membersRes.data || []).length} member(s)`, {
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
    if (!window.confirm('Are you sure you want to remove this member from the team?')) return;
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
      <div style={{ padding: 60, textAlign: 'center' }}>
        <div className="spinner" />
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
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
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
                  <td colSpan="7" style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-muted)' }}>
                    No members added to this team yet.
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--color-teal-dark), var(--color-teal))',
                          color: '#fff', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: 12, fontWeight: 700
                        }}>
                          {member.name?.[0]?.toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600, color: '#fff' }}>{member.name}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Mail size={13} style={{ color: 'var(--color-text-muted)' }} />
                        <span>{member.email}</span>
                      </div>
                    </td>
                    <td>{new Date(member.createdAt).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 600 }}>{member.assignedCount || 0}</td>
                    <td style={{ fontWeight: 600, color: 'var(--color-success)' }}>{member.closedCount || 0}</td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        color: member.isActive ? 'var(--color-success)' : 'var(--color-error)',
                        fontSize: 12, fontWeight: 500
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: member.isActive ? 'var(--color-success)' : 'var(--color-error)' }} />
                        {member.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: 6, color: 'var(--color-error)' }}
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
          <div className="modal-content" style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h3>Add Team Agent</h3>
              <button onClick={() => setShowModal(false)} className="modal-close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '0 28px 28px 28px' }}>
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
                {errors.name && <span style={{ fontSize: 12, color: '#f87171', marginTop: 4 }}>{errors.name}</span>}
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
                {errors.email && <span style={{ fontSize: 12, color: '#f87171', marginTop: 4 }}>{errors.email}</span>}
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
                {errors.password && <span style={{ fontSize: 12, color: '#f87171', marginTop: 4 }}>{errors.password}</span>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 14 }}>
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
