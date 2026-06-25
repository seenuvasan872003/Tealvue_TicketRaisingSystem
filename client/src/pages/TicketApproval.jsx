// ============================================================
//  client/src/pages/TicketApproval.jsx
// ============================================================
//  Accessible by: Super Admin ONLY
//  Content Moderation Panel (All, Suspended, Rejected tabs).
// ============================================================

import { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Check,
  X,
  Eye,
  AlertTriangle,
  RotateCcw,
  Clock,
  Download,
  Flag,
  FileText,
  User as UserIcon,
  Calendar,
  AlertOctagon,
  Info,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../services/authApi';
import StatusBadge, { PriorityBadge } from '../components/StatusBadge';

const TicketApproval = () => {
  const [tickets, setTickets] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // all | suspended | rejected
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState([]);

  // Detail Modal State
  const [detailTicketId, setDetailTicketId] = useState(null);
  const [detailTicket, setDetailTicket] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [moderationNoteInput, setModerationNoteInput] = useState('');
  const [flaggedAttachments, setFlaggedAttachments] = useState({});

  // Reject Modal State
  const [actioningTicketId, setActioningTicketId] = useState(null);
  const [actionType, setActionType] = useState(''); // suspend | reject
  const [modalNote, setModalNote] = useState('');

  const loadTickets = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/tickets/all');
      setTickets(data || []);
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load tickets list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const fetchTicketDetails = async (id) => {
    setLoadingDetail(true);
    setDetailTicketId(id);
    setModerationNoteInput('');
    setFlaggedAttachments({});
    try {
      const { data } = await API.get(`/tickets/${id}`);
      setDetailTicket(data);
    } catch (err) {
      toast.error('Failed to load ticket details');
      setDetailTicketId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSingleAction = async (id, action, note = '') => {
    try {
      if (action === 'suspend') {
        const { data } = await API.put(`/tickets/${id}/suspend`, { moderationNote: note });
        toast.success('Ticket suspended successfully');
        setTickets(prev => prev.map(t => t._id === id ? data.ticket : t));
        if (detailTicket && detailTicket._id === id) setDetailTicket(data.ticket);
      } else if (action === 'reject') {
        const { data } = await API.put(`/tickets/${id}/reject`, { moderationNote: note });
        toast.success('Ticket rejected successfully');
        setTickets(prev => prev.map(t => t._id === id ? data.ticket : t));
        if (detailTicket && detailTicket._id === id) setDetailTicket(data.ticket);
      } else if (action === 'restore') {
        const { data } = await API.put(`/tickets/${id}/restore`);
        toast.success('Ticket restored to active flow');
        setTickets(prev => prev.map(t => t._id === id ? data.ticket : t));
        if (detailTicket && detailTicket._id === id) setDetailTicket(data.ticket);
      }
      setActioningTicketId(null);
      setModalNote('');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Moderation action failed');
    }
  };

  const handleBulkAction = async (action, note = '') => {
    if (selectedIds.length === 0) return;
    try {
      await API.put('/tickets/bulk-moderate', {
        ids: selectedIds,
        action,
        moderationNote: note
      });
      toast.success(`Bulk ${action} action completed successfully`);
      loadTickets();
      setActioningTicketId(null);
      setModalNote('');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Bulk action failed');
    }
  };

  const handleSelectAll = (filtered) => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(t => t._id));
    }
  };

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(x => x !== id));
    } else {
      setSelectedIds(prev => [...prev, id]);
    }
  };

  // Local Filtering
  const filteredTickets = tickets.filter(t => {
    // Tab filter
    if (activeTab === 'suspended' && t.approvalStatus !== 'suspended') return false;
    if (activeTab === 'rejected' && t.approvalStatus !== 'rejected') return false;

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(query);
      const matchId = t._id.toLowerCase().includes(query);
      const matchUser = t.user_id?.name?.toLowerCase().includes(query);
      if (!matchTitle && !matchId && !matchUser) return false;
    }

    // Category filter
    if (categoryFilter && t.category !== categoryFilter) return false;

    // Priority filter
    if (priorityFilter && t.priority !== priorityFilter) return false;

    return true;
  });

  const getApprovalBadge = (status) => {
    if (status === 'approved') {
      return (
        <span className="badge" style={{ background: 'rgba(134,239,172,0.1)', color: '#86efac', border: '1px solid rgba(134,239,172,0.25)' }}>
          <CheckCircle size={10} /> Active / Approved
        </span>
      );
    }
    if (status === 'suspended') {
      return (
        <span className="badge" style={{ background: 'rgba(251,146,60,0.1)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.25)' }}>
          <AlertTriangle size={10} /> Suspended
        </span>
      );
    }
    return (
      <span className="badge" style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}>
        <AlertOctagon size={10} /> Rejected
      </span>
    );
  };

  const getFileIcon = (mimetype) => {
    if (mimetype?.startsWith('image/')) return null;
    return <FileText size={28} className="text-muted" style={{ opacity: 0.6 }} />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const toggleAttachmentFlag = (filename) => {
    setFlaggedAttachments(prev => ({
      ...prev,
      [filename]: !prev[filename]
    }));
  };

  return (
    <div className="page-body fade-in">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Content Moderation & Approvals</h1>
          <p className="page-subtitle">Review ticket content, images, attachments, and moderate compliance</p>
        </div>
      </div>

      {/* Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div className="stat-card" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>Total Tickets Reviewed</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{tickets.length}</div>
        </div>
        <div className="stat-card" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>Suspended Tickets</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#fb923c' }}>{tickets.filter(t => t.approvalStatus === 'suspended').length}</div>
        </div>
        <div className="stat-card" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>Rejected Tickets</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#f87171' }}>{tickets.filter(t => t.approvalStatus === 'rejected').length}</div>
        </div>
      </div>

      {/* Controls: Tabs & Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--color-border)', marginBottom: 20, paddingBottom: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { id: 'all', label: 'All Tickets' },
            { id: 'suspended', label: 'Flagged / Suspended' },
            { id: 'rejected', label: 'Rejected' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedIds([]); }}
              style={{
                padding: '8px 16px', background: 'none', border: 'none',
                color: activeTab === tab.id ? 'var(--color-teal)' : '#888',
                borderBottom: activeTab === tab.id ? '2px solid var(--color-teal)' : '2px solid transparent',
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
                transition: 'all 0.2s', outline: 'none'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search Title, ID, or User..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '6px 12px', background: '#111', border: '1px solid #333',
              borderRadius: 6, color: '#fff', fontSize: 13, minWidth: 200, outline: 'none'
            }}
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              padding: '6px 12px', background: '#111', border: '1px solid #333',
              borderRadius: 6, color: '#fff', fontSize: 13, outline: 'none'
            }}
          >
            <option value="">All Categories</option>
            <option value="General">General</option>
            <option value="Technical">Technical</option>
            <option value="Billing">Billing</option>
            <option value="HR">HR</option>
            <option value="Other">Other</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{
              padding: '6px 12px', background: '#111', border: '1px solid #333',
              borderRadius: 6, color: '#fff', fontSize: 13, outline: 'none'
            }}
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      {/* Bulk Action Controls */}
      {selectedIds.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(20,20,20,0.8)', border: '1px solid var(--color-border)', padding: '12px 16px', borderRadius: 8, marginBottom: 16, animation: 'fadeIn 0.2s' }}>
          <span style={{ fontSize: 13, color: 'var(--color-teal)', fontWeight: 600 }}>
            {selectedIds.length} tickets selected for bulk actions
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { setActionType('bulk-suspend'); setActioningTicketId('bulk'); setModalNote(''); }}
              style={{ padding: '6px 12px', background: '#fb923c', color: '#000', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
            >
              Bulk Suspend
            </button>
            <button
              onClick={() => { setActionType('bulk-reject'); setActioningTicketId('bulk'); setModalNote(''); }}
              style={{ padding: '6px 12px', background: '#f87171', color: '#000', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
            >
              Bulk Reject
            </button>
            <button
              onClick={() => handleBulkAction('restore')}
              style={{ padding: '6px 12px', background: '#86efac', color: '#000', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
            >
              Bulk Restore / Approve
            </button>
          </div>
        </div>
      )}

      {/* Tickets List Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spinner" style={{ width: 28, height: 28 }} />
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="empty-state" style={{ border: '1px solid var(--color-border)', borderRadius: 12 }}>
          <ShieldAlert size={44} strokeWidth={1.5} style={{ color: 'var(--color-text-muted)' }} />
          <h3>No tickets found matching the criteria</h3>
          <p>Change your search filters or tabs to view other tickets.</p>
        </div>
      ) : (
        <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
          <div className="table-wrap">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '12px 16px', width: 46 }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.length > 0 && selectedIds.length === filteredTickets.length}
                      onChange={() => handleSelectAll(filteredTickets)}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: '#acacac', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Ticket ID</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: '#acacac', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Title</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: '#acacac', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Category</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: '#acacac', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Priority</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: '#acacac', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>User</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', color: '#acacac', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Files</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: '#acacac', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: '#acacac', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Approval</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', color: '#acacac', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map(t => (
                  <tr key={t._id} style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
                    <td style={{ padding: '13px 16px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(t._id)}
                        onChange={() => handleSelectOne(t._id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '13px 16px', color: '#888', fontFamily: 'monospace', fontSize: 11 }}>
                      #{t._id.slice(-6).toUpperCase()}
                    </td>
                    <td style={{ padding: '13px 16px', fontWeight: 500, color: '#e4e4e4', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.title}>
                      {t.title}
                    </td>
                    <td style={{ padding: '13px 16px', color: '#acacac' }}>{t.category}</td>
                    <td style={{ padding: '13px 16px' }}><PriorityBadge priority={t.priority} /></td>
                    <td style={{ padding: '13px 16px', color: '#acacac' }}>{t.user_id?.name || '—'}</td>
                    <td style={{ padding: '13px 16px', textAlign: 'center', color: '#acacac' }}>
                      {t.attachments?.length || 0}
                    </td>
                    <td style={{ padding: '13px 16px' }}><StatusBadge status={t.status} /></td>
                    <td style={{ padding: '13px 16px' }}>{getApprovalBadge(t.approvalStatus)}</td>
                    <td style={{ padding: '13px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button
                          onClick={() => fetchTicketDetails(t._id)}
                          title="View Full Details"
                          style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.05)', border: '1px solid #333', borderRadius: 4, color: '#ccc', cursor: 'pointer' }}
                        >
                          <Eye size={12} />
                        </button>
                        {t.approvalStatus === 'approved' && (
                          <button
                            onClick={() => { setActionType('suspend'); setActioningTicketId(t._id); setModalNote(''); }}
                            title="Suspend"
                            style={{ padding: '4px 8px', background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.25)', borderRadius: 4, color: '#fb923c', cursor: 'pointer' }}
                          >
                            <X size={12} />
                          </button>
                        )}
                        {(t.approvalStatus === 'approved' || t.approvalStatus === 'suspended') && (
                          <button
                            onClick={() => { setActionType('reject'); setActioningTicketId(t._id); setModalNote(''); }}
                            title="Reject"
                            style={{ padding: '4px 8px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 4, color: '#f87171', cursor: 'pointer' }}
                          >
                            <AlertOctagon size={12} />
                          </button>
                        )}
                        {t.approvalStatus === 'suspended' && (
                          <button
                            onClick={() => handleSingleAction(t._id, 'restore')}
                            title="Restore / Approve"
                            style={{ padding: '4px 8px', background: 'rgba(134,239,172,0.1)', border: '1px solid rgba(134,239,172,0.25)', borderRadius: 4, color: '#86efac', cursor: 'pointer' }}
                          >
                            <RotateCcw size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Full Content Review Modal */}
      {detailTicketId && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999
        }}>
          <div style={{
            background: 'var(--color-card)', border: '1px solid var(--color-border)',
            borderRadius: 16, width: '92%', maxWidth: 960, height: '90vh',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6)'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--color-teal)', background: 'rgba(20,184,166,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                  TICKET #{detailTicketId.toUpperCase()}
                </span>
                <h2 style={{ color: '#fff', fontSize: 18, margin: '4px 0 0 0', fontWeight: 600 }}>Review Ticket Content</h2>
              </div>
              <button
                onClick={() => setDetailTicketId(null)}
                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            {loadingDetail ? (
              <div style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <div className="spinner" style={{ width: 32, height: 32 }} />
              </div>
            ) : detailTicket ? (
              <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Left Side: Ticket Content Details */}
                <div style={{ flex: 1, padding: 24, overflowY: 'auto', borderRight: '1px solid var(--color-border)' }}>
                  {/* Meta Row */}
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#acacac' }}>
                      <Calendar size={13} /> Submitted {new Date(detailTicket.createdAt).toLocaleDateString()}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#acacac' }}>
                      <Clock size={13} /> Category: <strong style={{ color: '#fff' }}>{detailTicket.category}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#acacac' }}>
                      Priority: <PriorityBadge priority={detailTicket.priority} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#acacac' }}>
                      Status: <StatusBadge status={detailTicket.status} />
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: 16, color: '#fff', fontWeight: 600, marginBottom: 8 }}>{detailTicket.title}</h3>
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #222', borderRadius: 8, padding: 16, color: '#ddd', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {detailTicket.description}
                    </div>
                  </div>

                  {/* Attachments Review */}
                  <div style={{ marginBottom: 24 }}>
                    <h4 style={{ fontSize: 14, color: '#fff', fontWeight: 600, marginBottom: 12 }}>Uploaded Files ({detailTicket.attachments?.length || 0})</h4>
                    {(!detailTicket.attachments || detailTicket.attachments.length === 0) ? (
                      <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>No attachments uploaded for this ticket.</p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                        {detailTicket.attachments.map((file, idx) => {
                          const isImage = file.mimetype?.startsWith('image/');
                          const isPdf = file.mimetype === 'application/pdf';
                          const isFlagged = !!flaggedAttachments[file.filename];
                          return (
                            <div
                              key={idx}
                              style={{
                                background: '#141414', border: isFlagged ? '1.5px solid #fb923c' : '1px solid #222',
                                borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 8, position: 'relative'
                              }}
                            >
                              {/* Preview thumbnail */}
                              {isImage ? (
                                <div style={{ height: 110, width: '100%', borderRadius: 4, overflow: 'hidden', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <img
                                    src={`http://localhost:5000${file.url}`}
                                    alt={file.originalName}
                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                  />
                                </div>
                              ) : (
                                <div style={{ height: 110, width: '100%', borderRadius: 4, background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                  {getFileIcon(file.mimetype)}
                                  <span style={{ fontSize: 11, color: '#acacac', fontWeight: 600 }}>
                                    {isPdf ? 'PDF DOCUMENT' : 'ATTACHMENT'}
                                  </span>
                                  {isPdf && (
                                    <span style={{ fontSize: 10, color: 'var(--color-teal)' }}>
                                      {/* Simulated page count */}
                                      PDF (3 pages)
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Details */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ fontSize: 12, fontWeight: 500, color: '#eee', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.originalName}>
                                  {file.originalName}
                                </span>
                                <span style={{ fontSize: 11, color: '#666' }}>
                                  {formatFileSize(file.size)}
                                </span>
                              </div>

                              {/* Actions */}
                              <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #222', paddingTop: 8, marginTop: 4 }}>
                                <a
                                  href={`http://localhost:5000${file.url}`}
                                  download
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ fontSize: 11, color: 'var(--color-teal)', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none', fontWeight: 600 }}
                                >
                                  <Download size={11} /> Download
                                </a>
                                <button
                                  type="button"
                                  onClick={() => toggleAttachmentFlag(file.filename)}
                                  style={{ background: 'none', border: 'none', color: isFlagged ? '#fb923c' : '#777', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600 }}
                                >
                                  <Flag size={11} fill={isFlagged ? '#fb923c' : 'none'} />
                                  {isFlagged ? 'Flagged' : 'Flag File'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* History & Meta Logs */}
                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 20 }}>
                    <h4 style={{ fontSize: 13, color: '#acacac', fontWeight: 600, marginBottom: 12 }}>System & Assignment History</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: '#888' }}>
                      <div>Created at: <strong style={{ color: '#ccc' }}>{new Date(detailTicket.createdAt).toLocaleString()}</strong></div>
                      {detailTicket.moderatedAt && (
                        <div>Last moderated: <strong style={{ color: '#ccc' }}>{new Date(detailTicket.moderatedAt).toLocaleString()}</strong></div>
                      )}
                      <div>
                        Assigned Agency: <strong style={{ color: 'var(--color-teal)' }}>{detailTicket.agencyId?.name || 'Unassigned (No auto-match)'}</strong>
                        {detailTicket.autoAllocated && <span style={{ fontSize: 10, color: '#666', marginLeft: 8 }}>(Auto-allocated)</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: User Info & Moderation Action Panel */}
                <div style={{ width: 340, background: '#111', padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* User Profile Card */}
                  <div style={{ background: '#171717', border: '1px solid #222', borderRadius: 10, padding: 16 }}>
                    <h4 style={{ fontSize: 13, color: '#888', fontWeight: 600, marginBottom: 12, textTransform: 'uppercase' }}>Ticket Submitter</h4>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-teal-dark), var(--color-teal))', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>
                        {detailTicket.user_id?.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{detailTicket.user_id?.name}</div>
                        <div style={{ fontSize: 11, color: '#666' }}>{detailTicket.user_id?.email}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, color: '#acacac', borderTop: '1px solid #222', paddingTop: 10 }}>
                      <div>Role: <strong style={{ color: '#fff' }}>{detailTicket.user_id?.role || 'user'}</strong></div>
                      <div>Joined: <strong style={{ color: '#fff' }}>{detailTicket.user_id?.createdAt ? new Date(detailTicket.user_id.createdAt).toLocaleDateString() : '—'}</strong></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #222', paddingTop: 6, marginTop: 4 }}>
                        <span>Total Tickets: <strong style={{ color: '#fff' }}>{detailTicket.user_id?.totalTicketsSubmitted || 1}</strong></span>
                        <span style={{ color: (detailTicket.user_id?.previousRejectedTickets > 0) ? '#f87171' : '#acacac' }}>
                          Rejects Flag: <strong>{detailTicket.user_id?.previousRejectedTickets || 0}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Current Status Badge */}
                  <div>
                    <span style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Approval State</span>
                    {getApprovalBadge(detailTicket.approvalStatus)}
                    {detailTicket.moderationNote && (
                      <div style={{ marginTop: 8, background: '#1c1917', border: '1px solid #292524', padding: 10, borderRadius: 6, fontSize: 12, color: '#fb923c' }}>
                        <span style={{ fontWeight: 600, display: 'block', fontSize: 10, color: '#a8a29e', textTransform: 'uppercase' }}>Note / Reason:</span>
                        {detailTicket.moderationNote}
                      </div>
                    )}
                  </div>

                  {/* Quick Action Decision Form */}
                  <div style={{ borderTop: '1px solid #222', paddingTop: 16 }}>
                    <h4 style={{ fontSize: 13, color: '#fff', fontWeight: 600, marginBottom: 12 }}>Moderator Verdict</h4>
                    
                    <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 6 }}>Action Reason / Note (visible to user)</label>
                    <textarea
                      placeholder="Specify reasons for suspend or reject (rejections require at least 10 chars)..."
                      value={moderationNoteInput}
                      onChange={(e) => setModerationNoteInput(e.target.value)}
                      style={{
                        width: '100%', minHeight: 70, background: '#0a0a0a', border: '1px solid #222',
                        borderRadius: 6, color: '#eee', padding: 8, fontSize: 12, resize: 'none',
                        outline: 'none', marginBottom: 12, fontFamily: 'sans-serif'
                      }}
                    />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {detailTicket.approvalStatus !== 'approved' && (
                        <button
                          onClick={() => handleSingleAction(detailTicket._id, 'restore')}
                          className="btn btn-sm"
                          style={{ background: '#86efac', color: '#000', border: 'none', width: '100%', fontWeight: 600 }}
                        >
                          Restore & Approve Ticket
                        </button>
                      )}
                      
                      {detailTicket.approvalStatus === 'approved' && (
                        <button
                          onClick={() => handleSingleAction(detailTicket._id, 'suspend', moderationNoteInput)}
                          className="btn btn-sm"
                          style={{ background: '#fb923c', color: '#000', border: 'none', width: '100%', fontWeight: 600 }}
                        >
                          Suspend Ticket
                        </button>
                      )}

                      {(detailTicket.approvalStatus === 'approved' || detailTicket.approvalStatus === 'suspended') && (
                        <button
                          onClick={() => {
                            if (!moderationNoteInput.trim() || moderationNoteInput.length < 10) {
                              toast.error('Rejection note is required (min 10 characters)');
                              return;
                            }
                            handleSingleAction(detailTicket._id, 'reject', moderationNoteInput);
                          }}
                          className="btn btn-sm"
                          style={{ background: '#f87171', color: '#000', border: 'none', width: '100%', fontWeight: 600 }}
                        >
                          Reject Ticket
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Note Prompt Modal for Bulk / Action Rows */}
      {actioningTicketId && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: 'var(--color-card)', border: '1px solid var(--color-border)',
            borderRadius: 12, padding: 24, width: '100%', maxWidth: 440,
            boxShadow: '0 12px 32px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ color: '#fff', fontSize: 16, margin: '0 0 8px 0', fontWeight: 600, textTransform: 'capitalize' }}>
              {actionType.replace('-', ' ')}
            </h3>
            <p style={{ color: '#acacac', fontSize: 12, margin: '0 0 16px 0' }}>
              {actionType.includes('reject')
                ? 'A rejection note explaining the decision is required (minimum 10 characters).'
                : 'Enter a moderation note to explain why this ticket is being suspended.'
              }
            </p>

            <textarea
              style={{
                width: '100%', minHeight: 90, background: '#111', border: '1px solid #3a3a3a',
                borderRadius: 8, color: '#e4e4e4', padding: 12, fontSize: 13, outline: 'none',
                resize: 'none', marginBottom: 16, fontFamily: 'sans-serif'
              }}
              placeholder="Reasoning here…"
              value={modalNote}
              onChange={(e) => setModalNote(e.target.value)}
              required
            />

            <div style={{ display: 'flex', gap: 8, justifySelf: 'stretch', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setActioningTicketId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm"
                style={{
                  background: actionType.includes('reject') ? '#f87171' : '#fb923c',
                  color: '#0a0a0a', border: 'none', cursor: 'pointer', fontWeight: 600
                }}
                onClick={() => {
                  if (actionType.includes('reject') && (!modalNote.trim() || modalNote.length < 10)) {
                    toast.error('Rejection reason must be at least 10 characters');
                    return;
                  }
                  if (actioningTicketId === 'bulk') {
                    const cleanAction = actionType.replace('bulk-', '');
                    handleBulkAction(cleanAction, modalNote);
                  } else {
                    handleSingleAction(actioningTicketId, actionType, modalNote);
                  }
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketApproval;
