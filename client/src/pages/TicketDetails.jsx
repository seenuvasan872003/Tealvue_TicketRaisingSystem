// ============================================================
//  client/src/pages/TicketDetails.jsx  —  Single Ticket View
// ============================================================
//  User:       view + comment + edit (own, open tickets only)
//  Admin:      view all + comment + update status (assigned only)
//  Super Admin:view all + edit all + assign admins
// ============================================================

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Hash, Calendar, User, Target, Tag,
  MessageSquare, Send, Lock, ShieldCheck, Paperclip,
  Clock, FileText, Plus, Edit3, Save, X, Crown,
  UserCheck, CheckCircle, XCircle
} from 'lucide-react';
import {
  getTicketById,
  updateTicket,
  getComments,
  addComment,
  addInternalNote,
  getTeams,
  assignTicketTeam,
  updateTicketStatus,
  updateTicketPriority,
  updateTicketDueDate,
  assignTicketMember,
  getTeamMembers,
  closeTicket,
  setTicketCategory,
  declineTicket,
  reallocateTicketTeam,
  transferTicketToAdmin,
  getCategories,
} from '../services/ticketApi';
import { getAllUsers } from '../services/userApi';
import { useAuth } from '../context/AuthContext';
import StatusBadge, { PriorityBadge } from '../components/StatusBadge';
import { toast } from 'react-toastify';
import TicketTimeline from '../components/TicketTimeline';
import { io } from 'socket.io-client';
import logger from '../utils/logger';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const PRIORITIES  = ['low', 'medium', 'high', 'urgent'];

const TicketDetails = () => {
  const { id } = useParams();
  const { user, isSuperAdmin, isAdminLevel } = useAuth();
  const navigate = useNavigate();

  const [ticket,   setTicket]   = useState(null);
  const [categories, setCategories] = useState(['General', 'Technical', 'Billing', 'HR', 'Other']);
  const [comments, setComments] = useState([]);
  const [comment,  setComment]  = useState('');
  const [note,     setNote]     = useState('');
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [sending,  setSending]  = useState(false);
  const [updating, setUpdating] = useState(false);

  // Edit mode for users (own tickets)
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '', category: '' });

  // Admins list (super admin use for assignment)
  const [admins,   setAdmins]   = useState([]);

  // Teams list (admin use for allocation)
  const [teams, setTeams] = useState([]);

  // Team members list (team admin use for member assignment)
  const [teamMembers, setTeamMembers] = useState([]);

  // Due date edit state for admin
  const [dueDateInput, setDueDateInput] = useState('');

  // Lightbox modal for attachments preview
  const [lightboxIndex, setLightboxIndex] = useState(null);

  // Reallocation and Transfer Modals (Staff)
  const [reallocateModal, setReallocateModal] = useState(false);
  const [reallocateCategory, setReallocateCategory] = useState('');
  const [reallocateReason, setReallocateReason] = useState('');

  const [transferModal, setTransferModal] = useState(false);
  const [transferReason, setTransferReason] = useState('');

  // Decline Modal (Admin)
  const [declineModal, setDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  // Category select state (Admin)
  const [adminCategory, setAdminCategory] = useState('General');

  const handleSetCategory = async (catVal) => {
    setUpdating(true);
    logger.info('TicketDetails', 'handleSetCategory', `Setting category to: ${catVal} for ticket: ${id}`, { api: `/api/tickets/${id}/category`, method: 'PUT', action: 'Ticket Set Category Start' });
    try {
      const { data } = await setTicketCategory(id, catVal);
      setTicket(data.ticket);
      toast.success('Category set and ticket allocated successfully');
      logger.info('TicketDetails', 'handleSetCategory', `Category set: ${catVal}`, { api: `/api/tickets/${id}/category`, method: 'PUT', status: 200, action: 'Ticket Set Category Success' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to set category');
      logger.error('TicketDetails', 'handleSetCategory', 'Failed to set category', err, { api: `/api/tickets/${id}/category`, method: 'PUT', status: err.response?.status, action: 'Ticket Set Category Failure' });
    } finally {
      setUpdating(false);
    }
  };

  const handleDeclineSubmit = async (e) => {
    e.preventDefault();
    if (!declineReason || declineReason.length < 5) {
      toast.error('Decline reason must be at least 5 characters');
      return;
    }
    setUpdating(true);
    try {
      const { data } = await declineTicket(id, declineReason);
      setTicket(data.ticket);
      setDeclineModal(false);
      setDeclineReason('');
      toast.success('Ticket declined successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to decline ticket');
    } finally {
      setUpdating(false);
    }
  };

  const handleReallocateSubmit = async (e) => {
    e.preventDefault();
    if (!reallocateCategory) {
      toast.error('Please select a team to transfer the ticket to');
      return;
    }
    if (!reallocateReason) {
      toast.error('Reallocation reason is required');
      return;
    }
    setUpdating(true);
    logger.info('TicketDetails', 'handleReallocateSubmit', `Reallocating ticket ${id} to category: ${reallocateCategory}`, { api: `/api/tickets/${id}/reallocate`, method: 'POST', action: 'Ticket Reallocate Start' });
    try {
      const { data } = await reallocateTicketTeam(id, reallocateCategory, reallocateReason);
      setTicket(data.ticket);
      setReallocateModal(false);
      setReallocateReason('');
      toast.success('Ticket reallocated successfully');
      logger.info('TicketDetails', 'handleReallocateSubmit', `Ticket reallocated to: ${reallocateCategory}`, { api: `/api/tickets/${id}/reallocate`, method: 'POST', status: 200, action: 'Ticket Reallocate Success' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reallocate ticket');
      logger.error('TicketDetails', 'handleReallocateSubmit', 'Ticket reallocation FAILED', err, { api: `/api/tickets/${id}/reallocate`, method: 'POST', status: err.response?.status, action: 'Ticket Reallocate Failure' });
    } finally {
      setUpdating(false);
    }
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!transferReason) {
      toast.error('Transfer reason is required');
      return;
    }
    setUpdating(true);
    logger.info('TicketDetails', 'handleTransferSubmit', `Transferring ticket ${id} back to admin`, { api: `/api/tickets/${id}/transfer`, method: 'POST', action: 'Ticket Transfer Start' });
    try {
      const { data } = await transferTicketToAdmin(id, transferReason);
      setTicket(data.ticket);
      setTransferModal(false);
      setTransferReason('');
      toast.success('Ticket transferred back to admin');
      logger.info('TicketDetails', 'handleTransferSubmit', `Ticket ${id} transferred to admin successfully`, { api: `/api/tickets/${id}/transfer`, method: 'POST', status: 200, action: 'Ticket Transfer Success' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to transfer ticket');
      logger.error('TicketDetails', 'handleTransferSubmit', 'Ticket transfer FAILED', err, { api: `/api/tickets/${id}/transfer`, method: 'POST', status: err.response?.status, action: 'Ticket Transfer Failure' });
    } finally {
      setUpdating(false);
    }
  };

  const load = async () => {
    logger.info('TicketDetails', 'load', `Loading ticket details for ID: ${id}`, { api: `/api/tickets/${id}`, method: 'GET', action: 'Ticket Details Load Start' });
    try {
      const [tRes, cRes] = await Promise.all([
        getTicketById(id),
        getComments(id),
      ]);
      setTicket(tRes.data);
      setEditForm({
        title:       tRes.data.title,
        description: tRes.data.description,
        category:    tRes.data.category,
      });
      setDueDateInput(tRes.data.dueDate ? tRes.data.dueDate.split('T')[0] : '');
      setComments(cRes.data);
      logger.info('TicketDetails', 'load', `Ticket loaded: "${tRes.data.title}" | status: ${tRes.data.status}`, { api: `/api/tickets/${id}`, method: 'GET', status: 200, action: 'Ticket Details Load Success' });
    } catch {
      logger.error('TicketDetails', 'load', `Ticket not found or access denied — ID: ${id}`, new Error('Ticket load failed'), { api: `/api/tickets/${id}`, method: 'GET', action: 'Ticket Details Load Failure' });
      setError('Ticket not found or you do not have access.');
    } finally {
      setLoading(false);
    }
  };

  const loadAdmins = async () => {
    try {
      const { data } = await getAllUsers({ role: 'admin' });
      const list = Array.isArray(data) ? data : (data.users || []);
      setAdmins(list.filter(u => u.role === 'admin' || u.role === 'super-admin'));
    } catch { /* silent */ }
  };

  const loadTeams = async () => {
    try {
      const { data } = await getTeams();
      setTeams(data || []);
    } catch { /* silent */ }
  };

  const loadTeamMembers = async (teamId) => {
    try {
      const { data } = await getTeamMembers(teamId);
      setTeamMembers(data || []);
    } catch { /* silent */ }
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => { if (isSuperAdmin) loadAdmins(); }, [isSuperAdmin]);

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const { data } = await getCategories();
        if (data && data.length > 0) {
          setCategories(data);
        }
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    };
    fetchCats();
  }, []);
  
  useEffect(() => { 
    if (user?.role === 'admin' || user?.role === 'team_admin' || user?.role === 'team_user') {
      loadTeams(); 
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === 'team_admin' && ticket?.teamId) {
      const tId = ticket.teamId._id || ticket.teamId;
      loadTeamMembers(tId);
    }
  }, [ticket, user]);

  // Real-time comments via WebSocket (Socket.io)
  useEffect(() => {
    if (!id) return;
    const socket = io(BASE_URL);

    socket.emit('joinTicket', id);

    socket.on('newComment', (newComment) => {
      setComments((prev) => {
        // Prevent duplicate comment render
        if (prev.some((c) => c._id === newComment._id)) return prev;
        return [...prev, newComment];
      });
    });

    return () => {
      socket.emit('leaveTicket', id);
      socket.disconnect();
    };
  }, [id]);

  // Lock background scroll when any modal is active
  useEffect(() => {
    if (reallocateModal || transferModal || declineModal || lightboxIndex !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [reallocateModal, transferModal, declineModal, lightboxIndex]);

  // ── Permissions ──────────────────────────────────────────
  const isOwner     = ticket?.user_id?._id?.toString() === user?._id?.toString()
                   || ticket?.user_id?.toString()       === user?._id?.toString();
  const isAssigned  = ticket?.assigned_to?._id?.toString() === user?._id?.toString()
                   || ticket?.assigned_to?.toString()       === user?._id?.toString();

  // Who can edit ticket content (title/desc/category)
  const canEditContent = user?.role === 'user' && isOwner && ticket?.status !== 'closed';

  // Who can update status (Admins only, Super Admin cannot change ticket status)
  const canUpdateStatus = user?.role === 'admin';

  // Who can assign admin (super admin only)
  const canAssign = isSuperAdmin;

  // Can current user comment (Admins/Team Admins can comment on their team's/any ticket, users on own)
  const canComment = ticket?.status !== 'closed' && !ticket?._isReadOnlyForTeam && (
    isOwner || 
    user?.role === 'admin' ||
    user?.role === 'team_admin' ||
    (user?.role === 'team_user' && ticket?.assignedToUser?._id?.toString() === user?._id?.toString())
  );

  // ── Actions ──────────────────────────────────────────────
  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSending(true);
    try {
      const { data } = await addComment({ ticket_id: id, comment });
      setComments((c) => {
        if (c.some((existing) => existing._id === data._id)) return c;
        return [...c, data];
      });
      setComment('');
      toast.success('Comment added');
    } catch {
      toast.error('Failed to add comment');
    } finally {
      setSending(false);
    }
  };

  const handleNote = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    setUpdating(true);
    try {
      await addInternalNote(id, { text: note });
      // Re-fetch to get updated notes
      const tRes = await getTicketById(id);
      setTicket(tRes.data);
      setNote('');
      toast.success('Internal note added');
    } catch {
      toast.error('Failed to add note');
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    try {
      const { data } = await updateTicketStatus(id, newStatus);
      setTicket(data.ticket || data);
      toast.success(`Status updated to "${newStatus}"`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handlePriorityChange = async (newPriority) => {
    setUpdating(true);
    try {
      const { data } = await updateTicketPriority(id, newPriority);
      setTicket(data.ticket || data);
      toast.success(`Priority updated to "${newPriority}"`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update priority');
    } finally {
      setUpdating(false);
    }
  };

  const handleTeamAssign = async (teamId) => {
    setUpdating(true);
    try {
      const { data } = await assignTicketTeam(id, teamId);
      setTicket(data.ticket);
      toast.success(teamId ? 'Ticket allocated to team' : 'Allocation removed');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to allocate ticket');
    } finally {
      setUpdating(false);
    }
  };

  const handleMemberAssign = async (memberId) => {
    setUpdating(true);
    try {
      await assignTicketMember(id, memberId);
      const tRes = await getTicketById(id);
      setTicket(tRes.data);
      toast.success('Ticket allocated to team agent');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to allocate to agent');
    } finally {
      setUpdating(false);
    }
  };

  const handleDueDateChange = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const { data } = await updateTicketDueDate(id, dueDateInput);
      setTicket(data.ticket || data);
      toast.success('Due date updated successfully');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update due date');
    } finally {
      setUpdating(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!window.confirm('Are you sure you want to mark this ticket as Closed?')) return;
    setUpdating(true);
    try {
      await closeTicket(id);
      const tRes = await getTicketById(id);
      setTicket(tRes.data);
      toast.success('Ticket marked as resolved and closed');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to close ticket');
    } finally {
      setUpdating(false);
    }
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const { data } = await updateTicket(id, editForm);
      setTicket(data);
      setEditMode(false);
      toast.success('Ticket updated');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update ticket');
    } finally {
      setUpdating(false);
    }
  };

  const fmt = (d) => new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  const fmtDateOnly = (d) => new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });

  // ── Render guards ─────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  );
  if (error) return (
    <div className="page-body fade-in">
      <button 
        className="btn btn-ghost btn-sm" 
        style={{ marginBottom: 20 }} 
        onClick={() => {
          if (user?.role === 'super-admin') navigate('/super-admin/dashboard');
          else if (user?.role === 'admin') navigate('/admin/dashboard');
          else if (user?.role === 'team_admin') navigate('/team-admin/dashboard');
          else if (user?.role === 'team_user') navigate('/team-user/dashboard');
          else navigate('/tickets');
        }}
      >
        <ArrowLeft size={14} /> Back
      </button>
      <div style={{ background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.2)', borderRadius: 12, padding: '40px 32px', textAlign: 'center' }}>
        <Lock size={32} style={{ color: '#f85149', marginBottom: 12 }} />
        <h2 style={{ color: '#f85149', marginBottom: 8 }}>Access Denied</h2>
        <p style={{ color: '#acacac' }}>{error}</p>
      </div>
    </div>
  );
  if (!ticket) return null;

  if (user?.role === 'user' && ticket.approvalStatus === 'rejected') {
    return (
      <div className="page-body fade-in">
        <button 
          className="btn btn-ghost btn-sm" 
          style={{ marginBottom: 20 }} 
          onClick={() => {
            if (user?.role === 'super-admin') navigate('/super-admin/dashboard');
            else if (user?.role === 'admin') navigate('/admin/dashboard');
            else if (user?.role === 'team_admin') navigate('/team-admin/dashboard');
            else if (user?.role === 'team_user') navigate('/team-user/dashboard');
            else navigate('/tickets');
          }}
        >
          <ArrowLeft size={14} /> Back to tickets
        </button>
        <div style={{
          background: 'rgba(248,113,113,0.05)',
          border: '1px solid rgba(248,113,113,0.18)',
          borderRadius: 12,
          padding: '40px 32px',
          color: '#f87171',
          fontSize: 14,
          lineHeight: 1.6,
          maxWidth: 600,
          margin: '60px auto',
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(248,113,113,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 8
          }}>
            <X size={32} style={{ color: '#ef4444' }} />
          </div>
          <h2 style={{ color: '#ef4444', margin: 0, fontSize: 20, fontWeight: 700 }}>Ticket Declined / Rejected</h2>
          {ticket.moderationNote && (
            <p style={{ color: '#acacac', margin: 0, fontStyle: 'italic', background: 'rgba(0,0,0,0.2)', padding: '10px 16px', borderRadius: 8, border: '1px solid var(--color-border)' }}>
              Reason: {ticket.moderationNote}
            </p>
          )}
          <p style={{ fontSize: 16, fontWeight: 600, margin: '8px 0 0 0', color: '#fff' }}>
            This ticket has been declined. Kindly create a new ticket.
          </p>
          <button 
            className="btn btn-primary" 
            style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 8 }} 
            onClick={() => navigate('/tickets/create')}
          >
            Create New Ticket
          </button>
        </div>
      </div>
    );
  }

  // ── UI helpers ────────────────────────────────────────────
  const card = {
    background: 'var(--color-card)', border: '1px solid var(--color-border)',
    borderRadius: 12, padding: '24px 28px',
  };

  const inputStyle = {
    background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8,
    color: 'var(--color-text)', fontSize: 14, padding: '10px 14px', width: '100%',
    outline: 'none', fontFamily: 'Roboto, sans-serif',
  };

  return (
    <>
      <div className="page-body fade-in">
      <button 
        className="btn btn-ghost btn-sm" 
        style={{ marginBottom: 20 }} 
        onClick={() => {
          if (user?.role === 'super-admin') navigate('/super-admin/dashboard');
          else if (user?.role === 'admin') navigate('/admin/dashboard');
          else if (user?.role === 'team_admin') navigate('/team-admin/dashboard');
          else if (user?.role === 'team_user') navigate('/team-user/dashboard');
          else navigate('/tickets');
        }}
      >
        <ArrowLeft size={14} /> Back to tickets
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>

        {/* ── Left column: ticket body + comments */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Main Ticket Card */}
          <div style={card}>
            {/* Badges row */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {ticket.approvalStatus === 'suspended' ? (
                <span className="badge" style={{ background: 'rgba(251,146,60,0.1)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.25)' }}>
                  Under Review
                </span>
              ) : ticket.approvalStatus === 'rejected' ? (
                <span className="badge" style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}>
                  Rejected
                </span>
              ) : (
                <StatusBadge status={ticket.status} />
              )}
              <PriorityBadge priority={ticket.priority} />
              <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #2e2e2e', textTransform: 'capitalize' }}>
                <Tag size={10} /> {ticket.category}
              </span>
              {isAssigned && !isSuperAdmin && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '3px 10px', background: 'rgba(211,167,60,0.1)', color: '#d3a73c', border: '1px solid rgba(211,167,60,0.25)', borderRadius: 20 }}>
                  <UserCheck size={11} /> Assigned to you
                </span>
              )}
            </div>

            {ticket.approvalStatus === 'suspended' && (
              <div style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13, color: '#fb923c', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={16} />
                <span><strong>Under Review:</strong> Your ticket has been flagged for content review. It will be restored or a decision will be communicated shortly.</span>
              </div>
            )}
            {ticket.approvalStatus === 'rejected' && (
              <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13, color: '#f87171', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <X size={16} />
                  <strong>Ticket Declined / Rejected</strong>
                </div>
                <div style={{ paddingLeft: 24, fontSize: 12, opacity: 0.9 }}>
                  Reason: {ticket.moderationNote || 'No explanation note provided.'}
                </div>
                <div style={{ paddingLeft: 24, fontSize: 13, fontWeight: 600, marginTop: 4, color: '#ff7878' }}>
                  This ticket has been declined. Kindly create a new ticket.
                </div>
              </div>
            )}

            {/* Title — editable for user on open tickets */}
            {editMode ? (
              <form onSubmit={handleEditSave}>
                <div className="field-group">
                  <label>Title</label>
                  <input style={inputStyle} value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} required />
                </div>
                <div className="field-group">
                  <label>Description</label>
                  <textarea style={{ ...inputStyle, minHeight: 120, resize: 'vertical' }} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginBottom: 16 }}>
                  <div className="field-group">
                    <label>Category</label>
                    <select style={inputStyle} value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}>
                      {categories.map(c => <option key={c} value={c}>{c.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="submit" className="btn btn-primary" disabled={updating}>
                    <Save size={14} /> {updating ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setEditMode(false)}>
                    <X size={14} /> Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                  <h1 style={{ fontSize: 20, fontWeight: 700, color: '#e4e4e4', margin: 0, flex: 1 }}>{ticket.title}</h1>
                  {canEditContent && (
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(true)}>
                      <Edit3 size={13} /> Edit
                    </button>
                  )}
                </div>
                <p style={{ fontSize: 14, color: '#acacac', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {ticket.description}
                </p>
              </>
            )}

            {/* Attachments */}
            {ticket.attachments?.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <h4 style={{ fontSize: 12, fontWeight: 600, color: '#e4e4e4', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <Paperclip size={14} /> Attachments
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {ticket.attachments.map((att, i) => {
                    const isImg = att.mimetype?.startsWith('image/') || 
                                  att.file_type?.startsWith('image/') ||
                                  /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(att.originalName || att.original_name || '');
                    if (isImg) {
                      return (
                        <div key={i} onClick={() => setLightboxIndex(i)} style={{ width: 90, height: 90, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--color-border)', background: 'var(--color-surface)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <img src={`${BASE_URL}${att.url}`} alt={att.originalName || att.original_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      );
                    }
                    return (
                      <a key={i} href={`${BASE_URL}${att.url}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                        <div style={{ width: 90, height: 90, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--color-border)', background: 'var(--color-surface)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          <FileText size={24} color="#acacac" />
                          <span style={{ fontSize: 10, color: '#acacac', textAlign: 'center', padding: '0 4px', marginTop: 4 }}>{att.originalName || att.original_name}</span>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Meta info */}
            <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 20, paddingTop: 16, display: 'flex', gap: 20, fontSize: 12, color: '#acacac', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Hash size={12} /> {ticket._id.slice(-6).toUpperCase()}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Calendar size={12} /> {fmt(ticket.createdAt)}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><User size={12} /> {ticket.user_id?.name}</span>
              {ticket.assigned_to && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#d3a73c' }}>
                  <Target size={12} /> Assigned to {ticket.assigned_to.name}
                </span>
              )}
            </div>
          </div>

          {/* Comments Card */}
          <div style={card}>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, color: '#e4e4e4' }}>
              <MessageSquare size={16} /> Comments ({comments.length})
            </h2>

            {comments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: '#555' }}>No comments yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {comments.map((c) => (
                  <div key={c._id} style={{ display: 'flex', gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #b8892a, #d3a73c)', color: '#0a0a0a', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {c.user_id?.name?.[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '10px 14px' }}>
                      <div style={{ fontSize: 11, color: '#acacac', marginBottom: 4, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                        <span style={{ fontWeight: 600, color: '#e4e4e4' }}>{c.user_id?.name}</span>
                        {(c.user_id?.role === 'admin' || c.user_id?.role === 'super-admin') && (
                          <span style={{ fontSize: 9, padding: '2px 6px', background: 'rgba(211,167,60,0.1)', color: '#d3a73c', border: '1px solid rgba(211,167,60,0.2)', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            {c.user_id.role === 'super-admin' ? <Crown size={9} /> : <ShieldCheck size={9} />}
                            {c.user_id.role === 'super-admin' ? 'Super Admin' : 'Admin'}
                          </span>
                        )}
                        <span style={{ marginLeft: 4 }}>{fmt(c.createdAt)}</span>
                      </div>
                      <p style={{ fontSize: 13, whiteSpace: 'pre-wrap', color: '#e4e4e4' }}>{c.comment}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {canComment ? (
              <form onSubmit={handleComment}>
                <div className="field-group">
                  <textarea
                    style={{ ...inputStyle, minHeight: 90 }}
                    placeholder="Write your comment…"
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={sending || !comment.trim()}>
                  {sending ? 'Posting…' : <><Send size={14} /> Post Comment</>}
                </button>
              </form>
            ) : (
              <div style={{ padding: '12px 16px', background: 'rgba(110,118,129,0.1)', borderRadius: 8, fontSize: 13, color: '#6e7681', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Lock size={14} /> {ticket?.status === 'closed' ? 'This ticket is closed — no further comments.' : 'Only the ticket owner, assigned admin, or super admin can comment.'}
              </div>
            )}
          </div>

          {/* Ticket Lifecycle Timeline — only visible to admin, super-admin, team_admin, team_user */}
          {['admin', 'super-admin', 'team_admin', 'team_user'].includes(user?.role) && (
            <TicketTimeline ticketId={id} />
          )}


        </div>

        {/* ── Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Read Only banner for reallocated/transferred tickets */}
          {ticket?._isReadOnlyForTeam && (
            <div style={{
              background: 'rgba(239,68,68,0.06)',
              border: '1px dashed #ef4444',
              borderRadius: 12,
              padding: '16px 20px',
              color: '#f87171',
              fontSize: 13,
              lineHeight: 1.5,
              display: 'flex',
              flexDirection: 'column',
              gap: 6
            }}>
              <strong style={{ color: '#ef4444', fontWeight: 600 }}>Ticket Reallocated / Transferred</strong>
              {ticket.allocationStatus === 'transferred_to_admin' ? (
                <span>This ticket was transferred back to Admins. Only Admins can view and take the next step.</span>
              ) : (
                <span>This ticket was reallocated to another team. It is now read-only for your team.</span>
              )}
            </div>
          )}

          <div style={card}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: '#e4e4e4' }}>Ticket Details</h3>
            {[
              { label: 'Status',    value: ticket.approvalStatus === 'suspended' ? (
                  <span className="badge" style={{ background: 'rgba(251,146,60,0.1)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.25)' }}>
                    Under Review
                  </span>
                ) : ticket.approvalStatus === 'rejected' ? (
                  <span className="badge" style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}>
                    Rejected
                  </span>
                ) : (
                  <StatusBadge status={ticket.status} />
                ) },
              ...(user?.role !== 'user' ? [
                { label: 'Priority',  value: <PriorityBadge priority={ticket.priority} /> },
                { label: 'Due Date',  value: ticket.dueDate
                    ? <span style={{ color: '#f85149', display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {fmtDateOnly(ticket.dueDate)}</span>
                    : <span style={{ color: '#555' }}>None</span> }
              ] : []),
              { label: 'Category',  value: <span style={{ textTransform: 'capitalize', color: '#e4e4e4' }}>{ticket.category}</span> },
              { label: 'Raised by', value: <span style={{ color: '#e4e4e4' }}>{ticket.user_id?.name}</span> },
              { label: 'Created',   value: <span style={{ color: '#acacac', fontSize: 11 }}>{fmt(ticket.createdAt)}</span> },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #252525', fontSize: 13 }}>
                <span style={{ color: '#acacac' }}>{label}</span>
                <span>{value}</span>
              </div>
            ))}
          </div>

          {/* Resolved & Closed Final State Card */}
          {ticket.status === 'closed' && (
            <div style={{
              background: 'rgba(34,197,94,0.04)',
              border: '1px solid rgba(34,197,94,0.18)',
              borderRadius: 12,
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: 12
            }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(34,197,94,0.1)',
                color: '#22c55e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CheckCircle size={28} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: 14, color: '#22c55e', fontWeight: 600 }}>Resolved & Closed</h4>
                <p style={{ margin: 0, fontSize: 12, color: '#acacac', lineHeight: 1.5 }}>
                  This ticket has been marked as completed. No further allocations or state updates are permitted.
                </p>
              </div>
            </div>
          )}

          {/* Suspended & Declined Final State Card */}
          {ticket.approvalStatus === 'suspended' && (
            <div style={{
              background: 'rgba(251,146,60,0.04)',
              border: '1px solid rgba(251,146,60,0.18)',
              borderRadius: 12,
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: 12
            }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(251,146,60,0.1)',
                color: '#fb923c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Clock size={28} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: 14, color: '#fb923c', fontWeight: 600 }}>Under Review</h4>
                <p style={{ margin: 0, fontSize: 12, color: '#acacac', lineHeight: 1.5 }}>
                  This ticket has been suspended for review. No further allocations or state updates are permitted.
                </p>
              </div>
            </div>
          )}

          {ticket.approvalStatus === 'rejected' && (
            <div style={{
              background: 'rgba(239,68,68,0.04)',
              border: '1px solid rgba(239,68,68,0.18)',
              borderRadius: 12,
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: 12
            }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(239,68,68,0.1)',
                color: '#f87171',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <XCircle size={28} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: 14, color: '#f87171', fontWeight: 600 }}>Rejected & Declined</h4>
                <p style={{ margin: 0, fontSize: 12, color: '#acacac', lineHeight: 1.5 }}>
                  This ticket has been declined. No further allocations or state updates are permitted.
                </p>
              </div>
            </div>
          )}

          {/* Admin Controls — only for standard admin */}
          {user?.role === 'admin' && ticket.status !== 'closed' && ticket.approvalStatus !== 'suspended' && ticket.approvalStatus !== 'rejected' && (
            <div style={card}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6, color: '#e4e4e4' }}>
                <ShieldCheck size={16} color="var(--color-teal)" /> Admin Controls
              </h3>

              {/* Status update */}
              <div className="field-group" style={{ marginBottom: 16 }}>
                <label>Update Status</label>
                <select
                  style={inputStyle}
                  value={ticket.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={updating}
                >
                  <option value="open">Open</option>
                  <option value="in-progress">In Progress</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              {/* Priority update */}
              <div className="field-group" style={{ marginBottom: 16 }}>
                <label>Update Priority</label>
                <select
                  style={inputStyle}
                  value={ticket.priority}
                  onChange={(e) => handlePriorityChange(e.target.value)}
                  disabled={updating}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {/* Due date update */}
              <form onSubmit={handleDueDateChange} style={{ marginBottom: 16 }}>
                <div className="field-group">
                  <label>Update Due Date</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="date"
                      style={{ ...inputStyle, flex: 1, padding: '6px 10px' }}
                      value={dueDateInput}
                      onChange={(e) => setDueDateInput(e.target.value)}
                      disabled={updating}
                    />
                    <button type="submit" className="btn btn-primary btn-sm" disabled={updating}>Set</button>
                  </div>
                </div>
              </form>

              {/* Team Assignment */}
              <div className="field-group" style={{ marginTop: 12 }}>
                <label>Assign Team (All Teams Available)</label>
                <select
                  style={inputStyle}
                  value={ticket.teamId?._id || ticket.teamId || ''}
                  onChange={(e) => handleTeamAssign(e.target.value)}
                  disabled={updating}
                >
                  <option value="">— Select Team —</option>
                  {teams.filter(t => t.isActive).map(t => {
                    const isMatch = t.categories?.map(c => c.toLowerCase()).includes(ticket.category?.toLowerCase());
                    return (
                      <option key={t.teamId || t._id} value={t.teamId || t._id}>
                        {t.name} {isMatch ? '(Category Match)' : '(Manual Override)'}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Allocated Team details card */}
              {ticket.teamId && (
                <div style={{ marginTop: 16, padding: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid #2e2e2e', borderRadius: 8 }}>
                  <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-teal)', margin: '0 0 6px 0' }}>Allocated Team</h4>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#fff' }}>{ticket.teamId.name || 'Assigned Team'}</div>
                  {ticket.assignedToUser && (
                    <div style={{ fontSize: 11, color: 'var(--color-teal)', marginTop: 4 }}>
                      Agent: {ticket.assignedToUser.name}
                    </div>
                  )}
                  {ticket.autoAllocated && (
                    <div style={{ fontSize: 9, color: 'var(--color-progress)', marginTop: 4, display: 'inline-block', background: 'rgba(211,167,60,0.1)', padding: '2px 6px', borderRadius: 4 }}>
                      Auto-Allocated
                    </div>
                  )}
                </div>
              )}

              {/* Set Category & Decline panel for Admin attention */}
              {(ticket.allocationStatus === 'pending_admin' || ticket.allocationStatus === 'transferred_to_admin') && (
                <div style={{ marginTop: 16, padding: '16px 14px', background: 'rgba(211,167,60,0.05)', border: '1px dashed #d3a73c', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: '#d3a73c', margin: 0 }}>Requires Allocation Attention</h4>
                  
                  <div className="field-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: 11, color: '#acacac' }}>Set Category to Auto-Allocate</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select
                        style={{ ...inputStyle, padding: '6px 10px', fontSize: 13 }}
                        value={adminCategory}
                        onChange={(e) => setAdminCategory(e.target.value)}
                        disabled={updating}
                      >
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        style={{ padding: '0 14px' }}
                        onClick={() => handleSetCategory(adminCategory)}
                        disabled={updating}
                      >
                        Set
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* General Decline Ticket Button for Admin */}
              <button
                type="button"
                className="btn btn-danger btn-sm"
                style={{ width: '100%', justifyContent: 'center', background: '#e53e3e', color: '#fff', border: 'none', padding: '8px 0', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13, marginTop: 16 }}
                onClick={() => setDeclineModal(true)}
                disabled={updating}
              >
                Decline Ticket
              </button>
            </div>
          )}

          {/* Team Admin Controls — only for own Team Admin */}
          {user?.role === 'team_admin' && ticket.teamId && ticket.status !== 'closed' && ticket.approvalStatus !== 'suspended' && ticket.approvalStatus !== 'rejected' && !ticket?._isReadOnlyForTeam && (
            <div style={card}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6, color: '#e4e4e4' }}>
                <ShieldCheck size={16} color="var(--color-teal)" /> Team Allocation
              </h3>
              <div className="field-group">
                <label>Allocate to Team Member</label>
                <select
                  style={inputStyle}
                  value={ticket.assignedToUser?._id || ticket.assignedToUser || ''}
                  onChange={(e) => handleMemberAssign(e.target.value)}
                  disabled={updating || ticket.status === 'closed'}
                >
                  <option value="">— Select Agent —</option>
                  {teamMembers.map(m => (
                    <option key={m._id} value={m._id}>{m.name}</option>
                  ))}
                </select>
              </div>

              {ticket.assignedToUser && (
                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--color-text-muted)' }}>
                  Currently assigned to: <strong style={{ color: '#fff' }}>{ticket.assignedToUser.name}</strong>
                </div>
              )}
            </div>
          )}

          {/* Team Agent Controls — only for assigned team_user */}
          {user?.role === 'team_user' && ticket.assignedToUser?._id?.toString() === user?._id?.toString() && ticket.status === 'in-progress' && ticket.approvalStatus !== 'suspended' && ticket.approvalStatus !== 'rejected' && !ticket?._isReadOnlyForTeam && (
            <div style={card}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6, color: '#e4e4e4' }}>
                <CheckCircle size={16} color="var(--color-success)" /> Resolve Ticket
              </h3>
              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', gap: 8, padding: '10px 0' }}
                onClick={handleCloseTicket}
                disabled={updating}
              >
                <CheckCircle size={15} /> Resolve & Close Ticket
              </button>
            </div>
          )}

          {/* Staff Allocation Actions — for Team Admin or assigned Team Agent */}
          {((user?.role === 'team_admin') || 
            (user?.role === 'team_user' && ticket.assignedToUser?._id?.toString() === user?._id?.toString())) && 
            ticket.status !== 'closed' && 
            ticket.approvalStatus !== 'suspended' && 
            ticket.approvalStatus !== 'rejected' && (
              <div style={card}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6, color: '#e4e4e4' }}>
                  <ShieldCheck size={16} color="var(--color-teal)" /> Staff Actions
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ width: '100%', justifyContent: 'center', border: '1px solid var(--color-border)' }}
                    onClick={() => {
                      setReallocateCategory('');
                      setReallocateModal(true);
                    }}
                    disabled={updating}
                  >
                    Reallocate to Other Team
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ width: '100%', justifyContent: 'center', border: '1px solid var(--color-border)' }}
                    onClick={() => setTransferModal(true)}
                    disabled={updating}
                  >
                    Transfer to Admin
                  </button>
                </div>
              </div>
          )}

          {/* Super Admin / General View-only details */}
          {(user?.role === 'super-admin' || (user?.role !== 'admin' && user?.role !== 'team_admin')) && ticket.teamId && (
            <div style={card}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, color: '#acacac' }}>
                <ShieldCheck size={16} color="#888" /> Support Team
              </h3>
              <div style={{ padding: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid #2e2e2e', borderRadius: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#fff' }}>{ticket.teamId.name}</div>
                {ticket.assignedToUser && (
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                    Assigned Agent: {ticket.assignedToUser.name}
                  </div>
                )}
                {ticket.autoAllocated && (
                  <div style={{ fontSize: 9, color: 'var(--color-progress)', marginTop: 4, display: 'inline-block', background: 'rgba(211,167,60,0.1)', padding: '2px 6px', borderRadius: 4 }}>
                    Auto-Allocated
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Internal Notes — admin/super-admin only */}
          {isAdminLevel && (
            <div style={{ background: 'rgba(211,167,60,0.04)', border: '1px solid rgba(211,167,60,0.18)', borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#d3a73c', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Lock size={12} /> Internal Notes
              </div>

              {ticket.internal_notes?.length > 0 ? (
                <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {ticket.internal_notes.map((n, i) => (
                    <div key={i} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: 10, color: '#acacac', marginBottom: 4 }}>
                        {n.author?.name || n.added_by?.name} • {fmt(n.createdAt)}
                      </div>
                      <div style={{ fontSize: 12, whiteSpace: 'pre-wrap', color: '#e4e4e4' }}>{n.text || n.note}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#555', marginBottom: 12 }}>No internal notes yet.</div>
              )}

              <form onSubmit={handleNote}>
                <textarea
                  style={{ ...inputStyle, minHeight: 60, fontSize: 12, padding: 8, marginBottom: 8 }}
                  placeholder="Add a private note (not visible to user)…"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
                <button type="submit" className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }} disabled={updating || !note.trim()}>
                  <Plus size={12} /> Add Note
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
      {/* Close the page-body fade-in container so that position: fixed modals render relative to the viewport instead of the animated page body container */}
      </div>

      {/* Lightbox Modal for Image Preview */}
      {lightboxIndex !== null && (() => {
        const imageAttachments = ticket.attachments.filter(att => 
          att.mimetype?.startsWith('image/') || 
          att.file_type?.startsWith('image/') ||
          /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(att.originalName || att.original_name || '')
        );
        const currentAttachment = ticket.attachments[lightboxIndex];
        const imageIndexInFiltered = imageAttachments.findIndex(att => att._id === currentAttachment._id);

        const handlePrev = (e) => {
          e.stopPropagation();
          const prevFilteredIndex = (imageIndexInFiltered - 1 + imageAttachments.length) % imageAttachments.length;
          const originalIndex = ticket.attachments.findIndex(att => att._id === imageAttachments[prevFilteredIndex]._id);
          setLightboxIndex(originalIndex);
        };

        const handleNext = (e) => {
          e.stopPropagation();
          const nextFilteredIndex = (imageIndexInFiltered + 1) % imageAttachments.length;
          const originalIndex = ticket.attachments.findIndex(att => att._id === imageAttachments[nextFilteredIndex]._id);
          setLightboxIndex(originalIndex);
        };

        return (
          <div 
            onClick={() => setLightboxIndex(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.9)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(8px)',
            }}
          >
            {/* Close Button */}
            <button 
              onClick={() => setLightboxIndex(null)}
              style={{
                position: 'absolute',
                top: 24,
                right: 24,
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#fff',
                width: 44,
                height: 44,
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >
              &times;
            </button>

            {/* Left Arrow */}
            {imageAttachments.length > 1 && (
              <button 
                onClick={handlePrev}
                style={{
                  position: 'absolute',
                  left: 24,
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: '#fff',
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              >
                &#8249;
              </button>
            )}

            {/* Image Container */}
            <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '80%', maxHeight: '80%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <img 
                src={`${BASE_URL}${currentAttachment.url}`} 
                alt={currentAttachment.originalName || currentAttachment.original_name} 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '80vh', 
                  borderRadius: 12, 
                  border: '1px solid #30363d',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.8)' 
                }} 
              />
              <div style={{ marginTop: 16, color: '#f0f6fc', fontSize: 14, fontWeight: 500, background: 'rgba(0,0,0,0.6)', padding: '6px 14px', borderRadius: 20 }}>
                {currentAttachment.originalName || currentAttachment.original_name} ({imageIndexInFiltered + 1} / {imageAttachments.length})
              </div>
            </div>

            {/* Right Arrow */}
            {imageAttachments.length > 1 && (
              <button 
                onClick={handleNext}
                style={{
                  position: 'absolute',
                  right: 24,
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: '#fff',
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              >
                &#8250;
              </button>
            )}
          </div>
        );
      })()}

      {/* Decline Ticket Modal */}
      {declineModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 28, width: '100%', maxWidth: 480 }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: '#ff4444', fontWeight: 600 }}>Decline Ticket</h3>
            <form onSubmit={handleDeclineSubmit}>
              <div className="field-group" style={{ marginBottom: 20 }}>
                <label>Decline Reason * (Min 5 chars)</label>
                <textarea
                  style={{ ...inputStyle, minHeight: 100 }}
                  placeholder="Explain why this ticket is being declined..."
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" className="btn btn-ghost" onClick={() => { setDeclineModal(false); setDeclineReason(''); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#ff4444', border: 'none' }} disabled={updating}>
                  {updating ? 'Declining...' : 'Decline Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reallocate Ticket Modal */}
      {reallocateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 28, width: '100%', maxWidth: 480 }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: '#e4e4e4', fontWeight: 600 }}>Reallocate to Other Team</h3>
            <form onSubmit={handleReallocateSubmit}>
              <div className="field-group" style={{ marginBottom: 16 }}>
                <label>Select Team to Transfer Ticket</label>
                <select
                  style={inputStyle}
                  value={reallocateCategory}
                  onChange={(e) => setReallocateCategory(e.target.value)}
                  disabled={updating}
                  required
                >
                  <option value="">-- Select Team --</option>
                  {teams
                    .filter(t => {
                      if (!t.isActive) return false;
                      const currentTeamId = (ticket.teamId?._id || ticket.teamId || '').toString();
                      const isCurrent = t._id.toString() === currentTeamId;
                      const oldTeamId = (ticket.reallocatedFromTeamId?._id || ticket.reallocatedFromTeamId || '').toString();
                      const isOld = oldTeamId && t._id.toString() === oldTeamId;
                      return !isCurrent && !isOld;
                    })
                    .map(t => (
                      <option key={t._id} value={t.categories[0]}>
                        {t.name} ({t.categories.join(', ')})
                      </option>
                    ))
                  }
                </select>
              </div>
              <div className="field-group" style={{ marginBottom: 20 }}>
                <label>Reason for Reallocation *</label>
                <textarea
                  style={{ ...inputStyle, minHeight: 80 }}
                  placeholder="Explain why this ticket is being reallocated to another team..."
                  value={reallocateReason}
                  onChange={(e) => setReallocateReason(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" className="btn btn-ghost" onClick={() => { setReallocateModal(false); setReallocateReason(''); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={updating}>
                  {updating ? 'Reallocating...' : 'Reallocate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer to Admin Modal */}
      {transferModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 28, width: '100%', maxWidth: 480 }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: '#e4e4e4', fontWeight: 600 }}>Transfer to Admin</h3>
            <form onSubmit={handleTransferSubmit}>
              <div className="field-group" style={{ marginBottom: 20 }}>
                <label>Reason for Transfer *</label>
                <textarea
                  style={{ ...inputStyle, minHeight: 100 }}
                  placeholder="Explain why this ticket is being transferred back to Admins..."
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" className="btn btn-ghost" onClick={() => { setTransferModal(false); setTransferReason(''); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={updating}>
                  {updating ? 'Transferring...' : 'Transfer to Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default TicketDetails;
