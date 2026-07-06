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
    if (categories.length > 0 && !categories.includes(adminCategory)) {
      setAdminCategory(categories[0]);
    }
  }, [categories, adminCategory]);
  
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
    <div className="flex items-center justify-center min-h-[300px]">
      <div className="spinner w-8 h-8" />
    </div>
  );
  if (error) return (
    <div className="page-body fade-in">
      <button 
        className="btn btn-ghost btn-sm mb-5" 
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
      <div className="bg-[rgba(248,81,73,0.08)] border border-[rgba(248,81,73,0.2)] rounded-xl px-8 py-10 text-center">
        <Lock size={32} className="text-[#f85149] mb-3 mx-auto" />
        <h2 className="text-[#f85149] mb-2">Access Denied</h2>
        <p className="text-[#acacac]">{error}</p>
      </div>
    </div>
  );
  if (!ticket) return null;

  if (user?.role === 'user' && ticket.approvalStatus === 'rejected') {
    return (
      <div className="page-body fade-in">
        <button 
          className="btn btn-ghost btn-sm mb-5" 
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
        <div className="bg-[rgba(248,113,113,0.05)] border border-[rgba(248,113,113,0.18)] rounded-xl px-8 py-10 text-[#f87171] text-sm leading-[1.6] max-w-[600px] my-[60px] mx-auto text-center shadow-[0_8px_32px_rgba(0,0,0,0.3)] flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[rgba(248,113,113,0.1)] flex items-center justify-center mb-2">
            <X size={32} className="text-[#ef4444]" />
          </div>
          <h2 className="text-[#ef4444] m-0 text-xl font-bold">Ticket Declined / Rejected</h2>
          {ticket.moderationNote && (
            <p className="text-[#acacac] m-0 italic bg-[rgba(0,0,0,0.2)] px-4 py-2.5 rounded-lg border border-[var(--color-border)]">
              Reason: {ticket.moderationNote}
            </p>
          )}
          <p className="text-base font-semibold mt-2 mb-0 text-white">
            This ticket has been declined. Kindly create a new ticket.
          </p>
          <button 
            className="btn btn-primary mt-3 inline-flex items-center gap-2" 
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
        className="btn btn-ghost btn-sm mb-5" 
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

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5 items-start w-full max-w-full">

        {/* ── Left column: ticket body + comments */}
        <div className="flex flex-col gap-4">

          {/* Main Ticket Card */}
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-7 py-6">
            {/* Badges row */}
            <div className="flex gap-2 flex-wrap mb-4">
              {ticket.approvalStatus === 'suspended' ? (
                <span className="badge bg-[rgba(251,146,60,0.1)] text-[#fb923c] border border-[rgba(251,146,60,0.25)]">
                  Under Review
                </span>
              ) : ticket.approvalStatus === 'rejected' ? (
                <span className="badge bg-[rgba(248,113,113,0.1)] text-[#f87171] border border-[rgba(248,113,113,0.25)]">
                  Rejected
                </span>
              ) : (
                <StatusBadge status={ticket.status} />
              )}
              <PriorityBadge priority={ticket.priority} />
              <span className="badge bg-[rgba(255,255,255,0.05)] border border-[#2e2e2e] capitalize">
                <Tag size={10} /> {ticket.category}
              </span>
              {isAssigned && !isSuperAdmin && (
                <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-[3px] bg-[rgba(211,167,60,0.1)] text-[#d3a73c] border border-[rgba(211,167,60,0.25)] rounded-full">
                  <UserCheck size={11} /> Assigned to you
                </span>
              )}
            </div>

            {ticket.approvalStatus === 'suspended' && (
              <div className="bg-[rgba(251,146,60,0.08)] border border-[rgba(251,146,60,0.2)] rounded-lg p-3 mb-4 text-[13px] text-[#fb923c] flex items-center gap-2">
                <Clock size={16} />
                <span><strong>Under Review:</strong> Your ticket has been flagged for content review. It will be restored or a decision will be communicated shortly.</span>
              </div>
            )}
            {ticket.approvalStatus === 'rejected' && (
              <div className="bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.2)] rounded-lg p-3 mb-4 text-[13px] text-[#f87171] flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <X size={16} />
                  <strong>Ticket Declined / Rejected</strong>
                </div>
                <div className="pl-6 text-xs opacity-90">
                  Reason: {ticket.moderationNote || 'No explanation note provided.'}
                </div>
                <div className="pl-6 text-[13px] font-semibold mt-1 text-[#ff7878]">
                  This ticket has been declined. Kindly create a new ticket.
                </div>
              </div>
            )}

            {/* Title — editable for user on open tickets */}
            {editMode ? (
              <form onSubmit={handleEditSave}>
                <div className="field-group">
                  <label>Title</label>
                  <input className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] text-sm px-3.5 py-2.5 w-full outline-none font-['Roboto',sans-serif]" value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} required />
                </div>
                <div className="field-group">
                  <label>Description</label>
                  <textarea className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] text-sm px-3.5 py-2.5 w-full outline-none font-['Roboto',sans-serif] min-h-[120px] resize-y" value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} required />
                </div>
                <div className="grid grid-cols-1 gap-3 mb-4">
                  <div className="field-group">
                    <label>Category</label>
                    <select 
                      className="select bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] text-[13px] py-1.5 pr-8 pl-2.5 w-full outline-none font-['Roboto',sans-serif]"
                      value={editForm.category} 
                      onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                    >
                      {categories.map(c => <option key={c} value={c}>{c.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2.5">
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
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h1 className="text-xl font-bold text-[#e4e4e4] m-0 flex-1">{ticket.title}</h1>
                  {canEditContent && (
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(true)}>
                      <Edit3 size={13} /> Edit
                    </button>
                  )}
                </div>
                <p className="text-sm text-[#acacac] leading-[1.7] whitespace-pre-wrap">
                  {ticket.description}
                </p>
              </>
            )}

            {/* Attachments */}
            {ticket.attachments?.length > 0 && (
              <div className="mt-6">
                <h4 className="text-xs font-semibold text-[#e4e4e4] flex items-center gap-1.5 mb-3">
                  <Paperclip size={14} /> Attachments
                </h4>
                <div className="flex flex-wrap gap-3">
                  {ticket.attachments.map((att, i) => {
                    const isImg = att.mimetype?.startsWith('image/') || 
                                  att.file_type?.startsWith('image/') ||
                                  /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(att.originalName || att.original_name || '');
                    if (isImg) {
                      return (
                        <div key={i} onClick={() => setLightboxIndex(i)} className="w-[90px] h-[90px] rounded-lg overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col items-center justify-center cursor-pointer">
                          <img src={`${BASE_URL}${att.url}`} alt={att.originalName || att.original_name} className="w-full h-full object-cover" />
                        </div>
                      );
                    }
                    return (
                      <a key={i} href={`${BASE_URL}${att.url}`} target="_blank" rel="noreferrer" className="no-underline">
                        <div className="w-[90px] h-[90px] rounded-lg overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col items-center justify-center">
                          <FileText size={24} color="#acacac" />
                          <span className="text-[10px] text-[#acacac] text-center px-1 mt-1">{att.originalName || att.original_name}</span>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Meta info */}
            <div className="border-t border-[var(--color-border)] mt-5 pt-4 flex gap-5 text-xs text-[#acacac] flex-wrap">
              <span className="flex items-center gap-1.5"><Hash size={12} /> {ticket._id.slice(-6).toUpperCase()}</span>
              <span className="flex items-center gap-1.5"><Calendar size={12} /> {fmt(ticket.createdAt)}</span>
              <span className="flex items-center gap-1.5"><User size={12} /> {ticket.user_id?.name}</span>
              {ticket.assigned_to && (
                <span className="flex items-center gap-1.5 text-[#d3a73c]">
                  <Target size={12} /> Assigned to {ticket.assigned_to.name}
                </span>
              )}
            </div>
          </div>

          {/* Comments Card */}
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-7 py-6">
            <h2 className="text-[15px] font-semibold mb-5 flex items-center gap-2 text-[#e4e4e4]">
              <MessageSquare size={16} /> Comments ({comments.length})
            </h2>

            {comments.length === 0 ? (
              <div className="text-center py-7.5 text-[#555]">No comments yet.</div>
            ) : (
              <div className="flex flex-col gap-3 mb-5">
                {comments.map((c) => (
                  <div key={c._id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#b8892a] to-[#d3a73c] text-[#0a0a0a] text-xs font-bold flex items-center justify-center shrink-0">
                      {c.user_id?.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3.5 py-2.5">
                      <div className="text-[11px] text-[#acacac] mb-1 flex items-center flex-wrap gap-1.5">
                        <span className="font-semibold text-[#e4e4e4]">{c.user_id?.name}</span>
                        {(c.user_id?.role === 'admin' || c.user_id?.role === 'super-admin') && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-[rgba(211,167,60,0.1)] text-[#d3a73c] border border-[rgba(211,167,60,0.2)] rounded-full inline-flex items-center gap-[3px]">
                            {c.user_id.role === 'super-admin' ? <Crown size={9} /> : <ShieldCheck size={9} />}
                            {c.user_id.role === 'super-admin' ? 'Super Admin' : 'Admin'}
                          </span>
                        )}
                        <span className="ml-1">{fmt(c.createdAt)}</span>
                      </div>
                      <p className="text-[13px] whitespace-pre-wrap text-[#e4e4e4]">{c.comment}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {canComment ? (
              <form onSubmit={handleComment}>
                <div className="field-group">
                  <textarea
                    className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] text-sm px-3.5 py-2.5 w-full outline-none font-['Roboto',sans-serif] min-h-[90px]"
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
              <div className="px-4 py-3 bg-[rgba(110,118,129,0.1)] rounded-lg text-[13px] text-[#6e7681] flex items-center gap-2">
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
        <div className="flex flex-col gap-4">

          {/* Read Only banner for reallocated/transferred tickets */}
          {ticket?._isReadOnlyForTeam && (
            <div className="bg-[rgba(239,68,68,0.06)] border border-dashed border-[#ef4444] rounded-xl px-5 py-4 text-[#f87171] text-[13px] leading-[1.5] flex flex-col gap-1.5">
              <strong className="text-[#ef4444] font-semibold">Ticket Reallocated / Transferred</strong>
              {ticket.allocationStatus === 'transferred_to_admin' ? (
                <span>This ticket was transferred back to Admins. Only Admins can view and take the next step.</span>
              ) : (
                <span>This ticket was reallocated to another team. It is now read-only for your team.</span>
              )}
            </div>
          )}

          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-7 py-6">
            <h3 className="text-sm font-semibold mb-4 text-[#e4e4e4]">Ticket Details</h3>
            {[
              { label: 'Status',    value: ticket.approvalStatus === 'suspended' ? (
                  <span className="badge bg-[rgba(251,146,60,0.1)] text-[#fb923c] border border-[rgba(251,146,60,0.25)]">
                    Under Review
                  </span>
                ) : ticket.approvalStatus === 'rejected' ? (
                  <span className="badge bg-[rgba(248,113,113,0.1)] text-[#f87171] border border-[rgba(248,113,113,0.25)]">
                    Rejected
                  </span>
                ) : (
                  <StatusBadge status={ticket.status} />
                ) },
              ...(user?.role !== 'user' ? [
                { label: 'Priority',  value: <PriorityBadge priority={ticket.priority} /> },
                { label: 'Due Date',  value: ticket.dueDate
                    ? <span className="text-[#f85149] flex items-center gap-1"><Clock size={12} /> {fmtDateOnly(ticket.dueDate)}</span>
                    : <span className="text-[#555]">None</span> }
              ] : []),
              { label: 'Category',  value: <span className="capitalize text-[#e4e4e4]">{ticket.category}</span> },
              { label: 'Raised by', value: <span className="text-[#e4e4e4]">{ticket.user_id?.name}</span> },
              { label: 'Created',   value: <span className="text-[#acacac] text-[11px]">{fmt(ticket.createdAt)}</span> },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-2 border-b border-[#252525] text-[13px]">
                <span className="text-[#acacac]">{label}</span>
                <span>{value}</span>
              </div>
            ))}
          </div>

          {/* Resolved & Closed Final State Card */}
          {ticket.status === 'closed' && (
            <div className="bg-[rgba(34,197,94,0.04)] border border-[rgba(34,197,94,0.18)] rounded-xl px-6 py-5 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[rgba(34,197,94,0.1)] text-[#22c55e] flex items-center justify-center">
                <CheckCircle size={28} />
              </div>
              <div>
                <h4 className="m-0 mb-1 text-sm text-[#22c55e] font-semibold">Resolved & Closed</h4>
                <p className="m-0 text-xs text-[#acacac] leading-[1.5]">
                  This ticket has been marked as completed. No further allocations or state updates are permitted.
                </p>
              </div>
            </div>
          )}

          {/* Suspended & Declined Final State Card */}
          {ticket.approvalStatus === 'suspended' && (
            <div className="bg-[rgba(251,146,60,0.04)] border border-[rgba(251,146,60,0.18)] rounded-xl px-6 py-5 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[rgba(251,146,60,0.1)] text-[#fb923c] flex items-center justify-center">
                <Clock size={28} />
              </div>
              <div>
                <h4 className="m-0 mb-1 text-sm text-[#fb923c] font-semibold">Under Review</h4>
                <p className="m-0 text-xs text-[#acacac] leading-[1.5]">
                  This ticket has been suspended for review. No further allocations or state updates are permitted.
                </p>
              </div>
            </div>
          )}

          {ticket.approvalStatus === 'rejected' && (
            <div className="bg-[rgba(239,68,68,0.04)] border border-[rgba(239,68,68,0.18)] rounded-xl px-6 py-5 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[rgba(239,68,68,0.1)] text-[#f87171] flex items-center justify-center">
                <XCircle size={28} />
              </div>
              <div>
                <h4 className="m-0 mb-1 text-sm text-[#f87171] font-semibold">Rejected & Declined</h4>
                <p className="m-0 text-xs text-[#acacac] leading-relaxed">
                  This ticket has been declined. No further allocations or state updates are permitted.
                </p>
              </div>
            </div>
          )}

          {/* Admin Controls — only for standard admin */}
          {user?.role === 'admin' && ticket.status !== 'closed' && ticket.approvalStatus !== 'suspended' && ticket.approvalStatus !== 'rejected' && (
            <div style={card}>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-1.5 text-[#e4e4e4]">
                <ShieldCheck size={16} color="var(--color-teal)" /> Admin Controls
              </h3>

              {/* Status update */}
              <div className="field-group mb-4">
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
              <div className="field-group mb-4">
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
              <form onSubmit={handleDueDateChange} className="mb-4">
                <div className="field-group">
                  <label>Update Due Date</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] text-sm px-2.5 py-1.5 flex-1 outline-none font-['Roboto',sans-serif]"
                      value={dueDateInput}
                      onChange={(e) => setDueDateInput(e.target.value)}
                      disabled={updating}
                    />
                    <button type="submit" className="btn btn-primary btn-sm" disabled={updating}>Set</button>
                  </div>
                </div>
              </form>

              {/* Team Assignment */}
              <div className="field-group mt-3">
                <label>Assign Team (All Teams Available)</label>
                <select
                  className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] text-sm px-3.5 py-2.5 w-full outline-none font-['Roboto',sans-serif]"
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
                <div className="mt-4 p-3 bg-[rgba(255,255,255,0.02)] border border-[#2e2e2e] rounded-lg">
                  <h4 className="text-[11px] font-bold uppercase tracking-[0.05em] text-[var(--color-teal)] m-0 mb-1.5">Allocated Team</h4>
                  <div className="font-semibold text-[13px] text-white">{ticket.teamId.name || 'Assigned Team'}</div>
                  {ticket.assignedToUser && (
                    <div className="text-[11px] text-[var(--color-teal)] mt-1">
                      Agent: {ticket.assignedToUser.name}
                    </div>
                  )}
                  {ticket.autoAllocated && (
                    <div className="text-[9px] text-[var(--color-progress)] mt-1 inline-block bg-[rgba(211,167,60,0.1)] px-1.5 py-0.5 rounded">
                      Auto-Allocated
                    </div>
                  )}
                </div>
              )}

              {/* Set Category & Decline panel for Admin attention */}
              {(ticket.allocationStatus === 'pending_admin' || ticket.allocationStatus === 'transferred_to_admin') && (
                <div className="mt-4 p-3.5 px-4 bg-[rgba(211,167,60,0.05)] border border-dashed border-[#d3a73c] rounded-lg flex flex-col gap-3">
                  <h4 className="text-xs font-bold text-[#d3a73c] m-0">Requires Allocation Attention</h4>
                  
                  <div className="field-group !m-0">
                    <label className="text-[11px] text-[#acacac]">Set Category to Auto-Allocate</label>
                    <div className="flex gap-2">
                      <select
                        className="select bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] text-[13px] py-1.5 pr-8 pl-2.5 outline-none font-['Roboto',sans-serif] w-auto min-w-[160px]"
                        value={adminCategory}
                        onChange={(e) => setAdminCategory(e.target.value)}
                        disabled={updating}
                      >
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm px-3.5"
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
                className="btn btn-danger btn-sm w-full justify-center bg-[#e53e3e] text-white border-none py-2 rounded-md cursor-pointer font-semibold text-[13px] mt-4"
                onClick={() => setDeclineModal(true)}
                disabled={updating}
              >
                Decline Ticket
              </button>
            </div>
          )}

          {/* Team Admin Controls — only for own Team Admin */}
          {user?.role === 'team_admin' && ticket.teamId && ticket.status !== 'closed' && ticket.approvalStatus !== 'suspended' && ticket.approvalStatus !== 'rejected' && !ticket?._isReadOnlyForTeam && (
            <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-7 py-6">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-1.5 text-[#e4e4e4]">
                <ShieldCheck size={16} color="var(--color-teal)" /> Team Allocation
              </h3>
              <div className="field-group">
                <label>Allocate to Team Member</label>
                <select
                  className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] text-sm px-3.5 py-2.5 w-full outline-none font-['Roboto',sans-serif]"
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
                <div className="mt-3 text-xs text-[var(--color-text-muted)]">
                  Currently assigned to: <strong className="text-white">{ticket.assignedToUser.name}</strong>
                </div>
              )}
            </div>
          )}

          {/* Team Agent Controls — only for assigned team_user */}
          {user?.role === 'team_user' && ticket.assignedToUser?._id?.toString() === user?._id?.toString() && ticket.status === 'in-progress' && ticket.approvalStatus !== 'suspended' && ticket.approvalStatus !== 'rejected' && !ticket?._isReadOnlyForTeam && (
            <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-7 py-6">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-1.5 text-[#e4e4e4]">
                <CheckCircle size={16} color="var(--color-success)" /> Resolve Ticket
              </h3>
              <button
                className="btn btn-primary w-full justify-center gap-2 py-2.5"
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
              <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-7 py-6">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-1.5 text-[#e4e4e4]">
                  <ShieldCheck size={16} color="var(--color-teal)" /> Staff Actions
                </h3>
                <div className="flex flex-col gap-2.5">
                  <button
                    type="button"
                    className="btn btn-ghost w-full justify-center border border-[var(--color-border)]"
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
                    className="btn btn-ghost w-full justify-center border border-[var(--color-border)]"
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
            <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-7 py-6">
              <h3 className="text-sm font-semibold mb-2.5 flex items-center gap-1.5 text-[#acacac]">
                <ShieldCheck size={16} color="#888" /> Support Team
              </h3>
              <div className="p-3 bg-[rgba(255,255,255,0.02)] border border-[#2e2e2e] rounded-lg">
                <div className="font-semibold text-[13px] text-white">{ticket.teamId.name}</div>
                {ticket.assignedToUser && (
                  <div className="text-[11px] text-[var(--color-text-muted)] mt-1">
                    Assigned Agent: {ticket.assignedToUser.name}
                  </div>
                )}
                {ticket.autoAllocated && (
                  <div className="text-[9px] text-[var(--color-progress)] mt-1 inline-block bg-[rgba(211,167,60,0.1)] px-1.5 py-0.5 rounded">
                    Auto-Allocated
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Internal Notes — admin/super-admin only */}
          {isAdminLevel && (
            <div className="bg-[rgba(211,167,60,0.04)] border border-[rgba(211,167,60,0.18)] rounded-xl px-5 py-4">
              <div className="text-xs font-bold uppercase tracking-[0.08em] text-[#d3a73c] mb-3 flex items-center gap-1.5">
                <Lock size={12} /> Internal Notes
              </div>

              {ticket.internal_notes?.length > 0 ? (
                <div className="mb-3 flex flex-col gap-2">
                  {ticket.internal_notes.map((n, i) => (
                    <div key={i} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2.5">
                      <div className="text-[10px] text-[#acacac] mb-1">
                        {n.author?.name || n.added_by?.name} • {fmt(n.createdAt)}
                      </div>
                      <div className="text-xs whitespace-pre-wrap text-[#e4e4e4]">{n.text || n.note}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-[#555] mb-3">No internal notes yet.</div>
              )}

              <form onSubmit={handleNote}>
                <textarea
                  className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] text-xs p-2 mb-2 w-full outline-none font-['Roboto',sans-serif] min-h-[60px]"
                  placeholder="Add a private note (not visible to user)…"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
                <button type="submit" className="btn btn-primary btn-sm w-full justify-center" disabled={updating || !note.trim()}>
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
            className="fixed inset-0 bg-[rgba(0,0,0,0.9)] z-[9999] flex items-center justify-center backdrop-blur-[8px]"
          >
            {/* Close Button */}
            <button 
              onClick={() => setLightboxIndex(null)}
              className="absolute top-6 right-6 bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.2)] border-none text-white w-11 h-11 rounded-full cursor-pointer text-2xl flex items-center justify-center transition-colors"
            >
              &times;
            </button>

            {/* Left Arrow */}
            {imageAttachments.length > 1 && (
              <button 
                onClick={handlePrev}
                className="absolute left-6 bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.2)] border-none text-white w-11 h-11 rounded-full cursor-pointer text-2xl flex items-center justify-center transition-colors"
              >
                &#8249;
              </button>
            )}

            {/* Image Container */}
            <div onClick={(e) => e.stopPropagation()} className="max-w-[80%] max-h-[80%] flex flex-col items-center">
              <img 
                src={`${BASE_URL}${currentAttachment.url}`} 
                alt={currentAttachment.originalName || currentAttachment.original_name} 
                className="max-w-full max-h-[80vh] rounded-xl border border-[#30363d] shadow-[0_8px_32px_rgba(0,0,0,0.8)]"
              />
              <div className="mt-4 text-[#f0f6fc] text-sm font-medium bg-[rgba(0,0,0,0.6)] px-3.5 py-1.5 rounded-full">
                {currentAttachment.originalName || currentAttachment.original_name} ({imageIndexInFiltered + 1} / {imageAttachments.length})
              </div>
            </div>

            {/* Right Arrow */}
            {imageAttachments.length > 1 && (
              <button 
                onClick={handleNext}
                className="absolute right-6 bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.2)] border-none text-white w-11 h-11 rounded-full cursor-pointer text-2xl flex items-center justify-center transition-colors"
              >
                &#8250;
              </button>
            )}
          </div>
        );
      })()}

      {/* Decline Ticket Modal */}
      {declineModal && (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.85)] flex items-center justify-center z-[1000] backdrop-blur-sm">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-7 w-full max-w-[480px]">
            <h3 className="m-0 mb-4 text-base text-[#ff4444] font-semibold">Decline Ticket</h3>
            <form onSubmit={handleDeclineSubmit}>
              <div className="field-group mb-5">
                <label>Decline Reason * (Min 5 chars)</label>
                <textarea
                  className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] text-sm px-3.5 py-2.5 w-full outline-none font-['Roboto',sans-serif] min-h-[100px]"
                  placeholder="Explain why this ticket is being declined..."
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" className="btn btn-ghost" onClick={() => { setDeclineModal(false); setDeclineReason(''); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary bg-[#ff4444] border-none" disabled={updating}>
                  {updating ? 'Declining...' : 'Decline Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reallocate Ticket Modal */}
      {reallocateModal && (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.85)] flex items-center justify-center z-[1000] backdrop-blur-sm">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-7 w-full max-w-[480px]">
            <h3 className="m-0 mb-4 text-base text-[#e4e4e4] font-semibold">Reallocate to Other Team</h3>
            <form onSubmit={handleReallocateSubmit}>
              <div className="field-group mb-4">
                <label>Select Team to Transfer Ticket</label>
                <select
                  className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] text-sm px-3.5 py-2.5 w-full outline-none font-['Roboto',sans-serif]"
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
              <div className="field-group mb-5">
                <label>Reason for Reallocation *</label>
                <textarea
                  className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] text-sm px-3.5 py-2.5 w-full outline-none font-['Roboto',sans-serif] min-h-[80px]"
                  placeholder="Explain why this ticket is being reallocated to another team..."
                  value={reallocateReason}
                  onChange={(e) => setReallocateReason(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
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
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.85)] flex items-center justify-center z-[1000] backdrop-blur-sm">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-7 w-full max-w-[480px]">
            <h3 className="m-0 mb-4 text-base text-[#e4e4e4] font-semibold">Transfer to Admin</h3>
            <form onSubmit={handleTransferSubmit}>
              <div className="field-group mb-5">
                <label>Reason for Transfer *</label>
                <textarea
                  className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] text-sm px-3.5 py-2.5 w-full outline-none font-['Roboto',sans-serif] min-h-[100px]"
                  placeholder="Explain why this ticket is being transferred back to Admins..."
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
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
