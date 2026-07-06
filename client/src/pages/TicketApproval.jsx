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
import { callFeatureApi } from '../services/apiResolver';
import { getFeatureApiPath } from '../config/featureHelpers';
import { useAuth } from '../context/AuthContext';
import StatusBadge, { PriorityBadge } from '../components/StatusBadge';
import logger from '../utils/logger';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const TicketApproval = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // all | suspended | rejected
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Server-side Pagination & Stats State
  const [page, setPage]         = useState(1);
  const [pages, setPages]       = useState(1);
  const [total, setTotal]       = useState(0);
  const [stats, setStats]       = useState({ totalReviewed: 0, totalSuspended: 0, totalRejected: 0 });
  const [categories, setCategories] = useState(['General', 'Technical', 'Billing', 'HR', 'Other']);

  // Advanced Filters State
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [dateRangeType, setDateRangeType] = useState(''); // '', weekly, monthly, particular, custom
  const [particularDate, setParticularDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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
    logger.info('TicketApproval', 'loadTickets', `Loading moderation tickets — tab: ${activeTab} | page: ${page}`, { api: '/api/tickets/all', method: 'GET', action: 'Ticket Approval Load Start' });
    try {
      const params = {
        page,
        limit: 20,
        tab: activeTab,
        search: searchQuery,
        category: categoryFilter,
        priority: priorityFilter,
        dateRangeType,
        particularDate,
        startDate,
        endDate
      };
      const { data } = await callFeatureApi('ticket_approval', user?.role, 'GET', null, params);
      setTickets(data.tickets || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
      if (data.stats) {
        setStats(data.stats);
      }
      setSelectedIds([]);
      logger.info('TicketApproval', 'loadTickets', `Moderation tickets loaded — ${(data.tickets || []).length} of ${data.total || 0}`, { api: '/api/tickets/all', method: 'GET', status: 200, action: 'Ticket Approval Load Success' });
    } catch (err) {
      logger.error('TicketApproval', 'loadTickets', 'Failed to load moderation tickets', err, { api: '/api/tickets/all', method: 'GET', action: 'Ticket Approval Load Failure' });
      console.error(err);
      toast.error('Failed to load tickets list');
    } finally {
      setLoading(false);
    }
  };

  // Load categories dynamically
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const { data } = await API.get('/teams/categories');
        if (data && data.length > 0) {
          setCategories(data);
        }
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    };
    fetchCats();
  }, []);

  // Fetch tickets reactive to filter and page changes
  useEffect(() => {
    loadTickets();
  }, [page, activeTab, categoryFilter, priorityFilter, searchQuery, dateRangeType, particularDate, startDate, endDate]);

  // Reset page to 1 on filter changes
  useEffect(() => {
    setPage(1);
  }, [activeTab, categoryFilter, priorityFilter, searchQuery, dateRangeType, particularDate, startDate, endDate]);

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
      const apiPath = getFeatureApiPath('ticket_approval', user?.role);
      const relativePath = apiPath.startsWith('/api') ? apiPath.substring(4) : apiPath;
      if (action === 'suspend') {
        const { data } = await API.put(`${relativePath}/${id}/suspend`, { moderationNote: note });
        toast.success('Ticket suspended successfully');
        setTickets(prev => prev.map(t => t._id === id ? data.ticket : t));
        if (detailTicket && detailTicket._id === id) setDetailTicket(data.ticket);
      } else if (action === 'reject') {
        const { data } = await API.put(`${relativePath}/${id}/reject`, { moderationNote: note });
        toast.success('Ticket rejected successfully');
        setTickets(prev => prev.map(t => t._id === id ? data.ticket : t));
        if (detailTicket && detailTicket._id === id) setDetailTicket(data.ticket);
      } else if (action === 'restore') {
        const { data } = await API.put(`${relativePath}/${id}/restore`);
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
      const apiPath = getFeatureApiPath('ticket_approval', user?.role);
      const relativePath = apiPath.startsWith('/api') ? apiPath.substring(4) : apiPath;
      await API.put(`${relativePath}/bulk-moderate`, {
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

  // Server-side filtered tickets
  const filteredTickets = tickets;

  const getApprovalBadge = (status) => {
    if (status === 'approved') {
      return (
        <span className="badge bg-[rgba(134,239,172,0.1)] text-[#86efac] border border-[rgba(134,239,172,0.25)]">
          <CheckCircle size={10} /> Active / Approved
        </span>
      );
    }
    if (status === 'suspended') {
      return (
        <span className="badge bg-[rgba(251,146,60,0.1)] text-[#fb923c] border border-[rgba(251,146,60,0.25)]">
          <AlertTriangle size={10} /> Suspended
        </span>
      );
    }
    return (
      <span className="badge bg-[rgba(248,113,113,0.1)] text-[#f87171] border border-[rgba(248,113,113,0.25)]">
        <AlertOctagon size={10} /> Rejected
      </span>
    );
  };

  const getFileIcon = (mimetype) => {
    if (mimetype?.startsWith('image/')) return null;
    return <FileText size={28} className="text-muted opacity-60" />;
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
      <div className="page-header mb-5">
        <div>
          <h1 className="page-title">Content Moderation & Approvals</h1>
          <p className="page-subtitle">Review ticket content, images, attachments, and moderate compliance</p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-5">
        <div className="stat-card bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4">
          <div className="text-xs text-[var(--color-text-muted)] mb-1">Total Tickets Reviewed</div>
          <div className="text-2xl font-bold">{stats.totalReviewed.toLocaleString()}</div>
        </div>
        <div className="stat-card bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4">
          <div className="text-xs text-[var(--color-text-muted)] mb-1">Suspended Tickets</div>
          <div className="text-2xl font-bold text-[#fb923c]">{stats.totalSuspended.toLocaleString()}</div>
        </div>
        <div className="stat-card bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4">
          <div className="text-xs text-[var(--color-text-muted)] mb-1">Rejected Tickets</div>
          <div className="text-2xl font-bold text-[#f87171]">{stats.totalRejected.toLocaleString()}</div>
        </div>
      </div>

      {/* Controls: Tabs & Filters */}
      <div className="flex justify-between items-center border-b border-[var(--color-border)] mb-4 pb-2">
        <div className="flex gap-2">
          {[
            { id: 'all', label: 'All Tickets' },
            { id: 'suspended', label: 'Flagged / Suspended' },
            { id: 'rejected', label: 'Rejected' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedIds([]); }}
              className={`px-4 py-2 bg-transparent border-none border-b-2 font-semibold text-[13px] transition-all cursor-pointer outline-none ${activeTab === tab.id ? 'text-[var(--color-teal)] border-[var(--color-teal)]' : 'text-[#888] border-transparent'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Full-width Horizontal Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-4 py-3 mb-5 w-full">
        <div className="w-full md:flex-1 md:min-w-[200px]">
          <input
            type="text"
            placeholder="Search Title, ID, or User..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-2 bg-[#111] border border-[#333] rounded-md text-white text-[13px] w-full outline-none"
          />
        </div>
        <div className="w-full md:w-auto flex flex-wrap md:flex-nowrap gap-3 items-center">
          <div className="flex-1 min-w-[140px] md:min-w-[160px]">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-[#111] border border-[#333] rounded-md text-white text-[13px] w-full outline-none cursor-pointer"
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[140px] md:min-w-[160px]">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 bg-[#111] border border-[#333] rounded-md text-white text-[13px] w-full outline-none cursor-pointer"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-4 py-2 border border-[#333] rounded-md text-[13px] font-semibold cursor-pointer transition-all whitespace-nowrap w-full md:w-auto ${showAdvancedFilters ? 'bg-[var(--color-teal)] text-black' : 'bg-[rgba(255,255,255,0.05)] text-white'}`}
            >
              {showAdvancedFilters ? 'Hide Advanced' : 'Advanced Filters'}
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Filters Expandable Panel */}
      {showAdvancedFilters && (
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-6 py-5 mb-5 flex flex-col gap-[18px] animate-[fadeIn_0.2s]">
          {/* Direct selection pills (No dropdown) */}
          <div>
            <label className="text-[11px] text-[#acacac] block mb-2 font-bold uppercase tracking-[0.05em]">
              Select Time Range
            </label>
            <div className="flex gap-2 flex-wrap">
              {[
                { id: '', label: 'No Date Filter' },
                { id: 'today', label: 'Today / Last 24 Hours' },
                { id: 'weekly', label: 'Last 7 Days (Weekly)' },
                { id: 'monthly', label: 'Last 30 Days (Monthly)' },
                { id: 'particular', label: 'Particular Date & Time' },
                { id: 'custom', label: 'Custom Date & Time Range' },
              ].map(opt => {
                const isActive = dateRangeType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setDateRangeType(opt.id);
                      setParticularDate('');
                      setStartDate('');
                      setEndDate('');
                    }}
                    className={`px-4 py-2 border rounded-full text-xs font-semibold cursor-pointer transition-all outline-none ${isActive ? 'bg-[var(--color-teal-muted)] border-[var(--color-teal)] text-white shadow-[0_0_10px_rgba(20,160,125,0.2)]' : 'bg-[rgba(255,255,255,0.02)] border-[#333] text-[#acacac]'}`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date & Time Inputs */}
          {(dateRangeType === 'particular' || dateRangeType === 'custom') && (
            <div className="flex gap-4 flex-wrap items-center pt-3 border-t border-[rgba(255,255,255,0.05)]">
              {dateRangeType === 'particular' && (
                <div className="field-group !m-0">
                  <label className="text-[11px] text-[#acacac] block mb-1.5 font-semibold">Select Date & Time</label>
                  <input
                    type="datetime-local"
                    value={particularDate}
                    onChange={(e) => setParticularDate(e.target.value)}
                    className="px-3 py-2 bg-[#111] border border-[#333] rounded-md text-white text-[13px] outline-none min-w-[220px]"
                  />
                </div>
              )}

              {dateRangeType === 'custom' && (
                <>
                  <div className="field-group !m-0">
                    <label className="text-[11px] text-[#acacac] block mb-1.5 font-semibold">Start Date & Time</label>
                    <input
                      type="datetime-local"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-3 py-2 bg-[#111] border border-[#333] rounded-md text-white text-[13px] outline-none min-w-[220px]"
                    />
                  </div>
                  <div className="field-group !m-0">
                    <label className="text-[11px] text-[#acacac] block mb-1.5 font-semibold">End Date & Time</label>
                    <input
                      type="datetime-local"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-3 py-2 bg-[#111] border border-[#333] rounded-md text-white text-[13px] outline-none min-w-[220px]"
                    />
                  </div>
                </>
              )}

              <button
                type="button"
                className="btn btn-ghost btn-sm px-4 mt-[18px] text-xs h-8 inline-flex items-center border border-[#333] rounded-md"
                onClick={() => {
                  setParticularDate('');
                  setStartDate('');
                  setEndDate('');
                }}
              >
                Clear Inputs
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bulk Action Controls */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between bg-[rgba(20,20,20,0.8)] border border-[var(--color-border)] px-4 py-3 rounded-lg mb-4 animate-[fadeIn_0.2s]">
          <span className="text-[13px] text-[var(--color-teal)] font-semibold">
            {selectedIds.length} tickets selected for bulk actions
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => { setActionType('bulk-suspend'); setActioningTicketId('bulk'); setModalNote(''); }}
              className="px-3 py-1.5 bg-[#fb923c] text-black border-none rounded cursor-pointer text-xs font-semibold"
            >
              Bulk Suspend
            </button>
            <button
              onClick={() => { setActionType('bulk-reject'); setActioningTicketId('bulk'); setModalNote(''); }}
              className="px-3 py-1.5 bg-[#f87171] text-black border-none rounded cursor-pointer text-xs font-semibold"
            >
              Bulk Reject
            </button>
            <button
              onClick={() => handleBulkAction('restore')}
              className="px-3 py-1.5 bg-[#86efac] text-black border-none rounded cursor-pointer text-xs font-semibold"
            >
              Bulk Restore / Approve
            </button>
          </div>
        </div>
      )}

      {/* Tickets List Table */}
      {loading ? (
        <div className="flex justify-center p-[60px]">
          <div className="spinner w-7 h-7" />
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="empty-state border border-[var(--color-border)] rounded-xl">
          <ShieldAlert size={44} strokeWidth={1.5} className="text-[var(--color-text-muted)]" />
          <h3>No tickets found matching the criteria</h3>
          <p>Change your search filters or tabs to view other tickets.</p>
        </div>
      ) : (
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
          <div className="table-wrap">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-[rgba(255,255,255,0.03)] border-b border-[var(--color-border)]">
                  <th className="px-4 py-3 w-[46px]">
                    <input
                      type="checkbox"
                      checked={selectedIds.length > 0 && selectedIds.length === filteredTickets.length}
                      onChange={() => handleSelectAll(filteredTickets)}
                      className="cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-[#acacac] font-semibold text-[11px] uppercase">Ticket ID</th>
                  <th className="px-4 py-3 text-left text-[#acacac] font-semibold text-[11px] uppercase">Title</th>
                  <th className="px-4 py-3 text-left text-[#acacac] font-semibold text-[11px] uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-[#acacac] font-semibold text-[11px] uppercase">Priority</th>
                  <th className="px-4 py-3 text-left text-[#acacac] font-semibold text-[11px] uppercase">User</th>
                  <th className="px-4 py-3 text-center text-[#acacac] font-semibold text-[11px] uppercase">Files</th>
                  <th className="px-4 py-3 text-left text-[#acacac] font-semibold text-[11px] uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-[#acacac] font-semibold text-[11px] uppercase">Approval</th>
                  <th className="px-4 py-3 text-center text-[#acacac] font-semibold text-[11px] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map(t => (
                  <tr key={t._id} className="border-b border-[var(--color-border-soft)]">
                    <td className="px-4 py-[13px] text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(t._id)}
                        onChange={() => handleSelectOne(t._id)}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-[13px] text-[#888] font-mono text-[11px]">
                      #{t._id.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-4 py-[13px] font-medium text-[#e4e4e4] max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap" title={t.title}>
                      {t.title}
                    </td>
                    <td className="px-4 py-[13px] text-[#acacac]">{t.category}</td>
                    <td className="px-4 py-[13px]"><PriorityBadge priority={t.priority} /></td>
                    <td className="px-4 py-[13px] text-[#acacac]">{t.user_id?.name || '—'}</td>
                    <td className="px-4 py-[13px] text-center text-[#acacac]">
                      {t.attachments?.length || 0}
                    </td>
                    <td className="px-4 py-[13px]"><StatusBadge status={t.status} /></td>
                    <td className="px-4 py-[13px]">{getApprovalBadge(t.approvalStatus)}</td>
                    <td className="px-4 py-[13px] text-center">
                      <div className="flex gap-1.5 justify-center">
                        <button
                          onClick={() => fetchTicketDetails(t._id)}
                          title="View Full Details"
                          className="px-2 py-1 bg-[rgba(255,255,255,0.05)] border border-[#333] rounded text-[#ccc] cursor-pointer"
                        >
                          <Eye size={12} />
                        </button>
                        {t.approvalStatus === 'approved' && (
                          <button
                            onClick={() => { setActionType('suspend'); setActioningTicketId(t._id); setModalNote(''); }}
                            title="Suspend"
                            className="px-2 py-1 bg-[rgba(251,146,60,0.1)] border border-[rgba(251,146,60,0.25)] rounded text-[#fb923c] cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                        {(t.approvalStatus === 'approved' || t.approvalStatus === 'suspended') && (
                          <button
                            onClick={() => { setActionType('reject'); setActioningTicketId(t._id); setModalNote(''); }}
                            title="Reject"
                            className="px-2 py-1 bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.25)] rounded text-[#f87171] cursor-pointer"
                          >
                            <AlertOctagon size={12} />
                          </button>
                        )}
                        {t.approvalStatus === 'suspended' && (
                          <button
                            onClick={() => handleSingleAction(t._id, 'restore')}
                            title="Restore / Approve"
                            className="px-2 py-1 bg-[rgba(134,239,172,0.1)] border border-[rgba(134,239,172,0.25)] rounded text-[#86efac] cursor-pointer"
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
          {/* Pagination Controls */}
          <div className="flex justify-between items-center px-6 py-3.5 border-t border-[var(--color-border)] bg-[rgba(255,255,255,0.01)]">
            <span className="text-xs text-[var(--color-text-muted)]">
              Showing <strong>{total === 0 ? 0 : ((page - 1) * 20) + 1}</strong> to <strong>{Math.min(page * 20, total)}</strong> of <strong>{total}</strong> tickets
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className={`btn btn-ghost btn-sm px-3 py-1.5 flex items-center gap-1 ${page === 1 ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                disabled={page === 1}
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className={`btn btn-ghost btn-sm px-3 py-1.5 flex items-center gap-1 ${(page === pages || pages === 0) ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                disabled={page === pages || pages === 0}
                onClick={() => setPage(prev => Math.min(prev + 1, pages))}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Content Review Modal */}
      {detailTicketId && (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.85)] backdrop-blur-md flex items-center justify-center z-[999]">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl w-[92%] max-w-[960px] h-[90vh] flex flex-col overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.6)]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[var(--color-border)] flex justify-between items-center">
              <div>
                <span className="text-[11px] font-mono text-[var(--color-teal)] bg-[rgba(20,184,166,0.1)] px-2 py-0.5 rounded">
                  TICKET #{detailTicketId.toUpperCase()}
                </span>
                <h2 className="text-white text-lg mt-1 mb-0 font-semibold">Review Ticket Content</h2>
              </div>
              <button
                onClick={() => setDetailTicketId(null)}
                className="bg-transparent border-none text-[#888] cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            {loadingDetail ? (
              <div className="flex flex-1 justify-center items-center">
                <div className="spinner w-8 h-8" />
              </div>
            ) : detailTicket ? (
              <div className="flex flex-1 overflow-hidden">
                {/* Left Side: Ticket Content Details */}
                <div className="flex-1 p-6 overflow-y-auto border-r border-[var(--color-border)]">
                  {/* Meta Row */}
                  <div className="flex gap-3 flex-wrap mb-5">
                    <div className="flex items-center gap-1.5 text-xs text-[#acacac]">
                      <Calendar size={13} /> Submitted {new Date(detailTicket.createdAt).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[#acacac]">
                      <Clock size={13} /> Category: <strong className="text-white">{detailTicket.category}</strong>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[#acacac]">
                      Priority: <PriorityBadge priority={detailTicket.priority} />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[#acacac]">
                      Status: <StatusBadge status={detailTicket.status} />
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="mb-6">
                    <h3 className="text-base text-white font-semibold mb-2">{detailTicket.title}</h3>
                    <div className="bg-[rgba(255,255,255,0.02)] border border-[#222] rounded-lg p-4 text-[#ddd] text-[13px] leading-relaxed whitespace-pre-wrap">
                      {detailTicket.description}
                    </div>
                  </div>

                  {/* Attachments Review */}
                  <div className="mb-6">
                    <h4 className="text-sm text-white font-semibold mb-3">Uploaded Files ({detailTicket.attachments?.length || 0})</h4>
                    {(!detailTicket.attachments || detailTicket.attachments.length === 0) ? (
                      <p className="text-xs text-[var(--color-text-muted)]">No attachments uploaded for this ticket.</p>
                    ) : (
                      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
                        {detailTicket.attachments.map((file, idx) => {
                          const isImage = file.mimetype?.startsWith('image/');
                          const isPdf = file.mimetype === 'application/pdf';
                          const isFlagged = !!flaggedAttachments[file.filename];
                          return (
                            <div
                              key={idx}
                              className={`bg-[#141414] rounded-lg p-3 flex flex-col gap-2 relative ${isFlagged ? 'border-[1.5px] border-[#fb923c]' : 'border border-[#222]'}`}
                            >
                              {/* Preview thumbnail */}
                              {isImage ? (
                                <div className="h-[110px] w-full rounded overflow-hidden bg-[#0a0a0a] flex items-center justify-center">
                                  <img
                                    src={`${BASE_URL}${file.url}`}
                                    alt={file.originalName}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                              ) : (
                                <div className="h-[110px] w-full rounded bg-[#0a0a0a] flex flex-col items-center justify-center gap-1.5">
                                  {getFileIcon(file.mimetype)}
                                  <span className="text-[11px] text-[#acacac] font-semibold">
                                    {isPdf ? 'PDF DOCUMENT' : 'ATTACHMENT'}
                                  </span>
                                  {isPdf && (
                                    <span className="text-[10px] text-[var(--color-teal)]">
                                      {/* Simulated page count */}
                                      PDF (3 pages)
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Details */}
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-medium text-[#eee] overflow-hidden text-ellipsis whitespace-nowrap" title={file.originalName}>
                                  {file.originalName}
                                </span>
                                <span className="text-[11px] text-[#666]">
                                  {formatFileSize(file.size)}
                                </span>
                              </div>

                              {/* Actions */}
                              <div className="flex justify-between items-center border-t border-[#222] pt-2 mt-1 self-stretch">
                                <a
                                  href={`${BASE_URL}${file.url}`}
                                  download
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] text-[var(--color-teal)] inline-flex items-center gap-1 no-underline font-semibold"
                                >
                                  <Download size={11} /> Download
                                </a>
                                <button
                                  type="button"
                                  onClick={() => toggleAttachmentFlag(file.filename)}
                                  className={`bg-transparent border-none cursor-pointer inline-flex items-center gap-1 text-[11px] font-semibold ${isFlagged ? 'text-[#fb923c]' : 'text-[#777]'}`}
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
                  <div className="border-t border-[var(--color-border)] pt-5">
                    <h4 className="text-[13px] text-[#acacac] font-semibold mb-3">System & Assignment History</h4>
                    <div className="flex flex-col gap-2 text-xs text-[#888]">
                      <div>Created at: <strong className="text-[#ccc]">{new Date(detailTicket.createdAt).toLocaleString()}</strong></div>
                      {detailTicket.moderatedAt && (
                        <div>Last moderated: <strong className="text-[#ccc]">{new Date(detailTicket.moderatedAt).toLocaleString()}</strong></div>
                      )}
                      <div>
                        Assigned Agency: <strong className="text-[var(--color-teal)]">{detailTicket.agencyId?.name || 'Unassigned (No auto-match)'}</strong>
                        {detailTicket.autoAllocated && <span className="text-[10px] text-[#666] ml-2">(Auto-allocated)</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: User Info & Moderation Action Panel */}
                <div className="w-[340px] bg-[#111] p-6 overflow-y-auto flex flex-col gap-5">
                  {/* User Profile Card */}
                  <div className="bg-[#171717] border border-[#222] rounded-[10px] p-4">
                    <h4 className="text-[13px] text-[#888] font-semibold mb-3 uppercase">Ticket Submitter</h4>
                    
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--color-teal-dark)] to-[var(--color-teal)] text-black flex items-center justify-center font-bold text-sm">
                        {detailTicket.user_id?.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold text-white">{detailTicket.user_id?.name}</div>
                        <div className="text-[11px] text-[#666]">{detailTicket.user_id?.email}</div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 text-[11px] text-[#acacac] border-t border-[#222] pt-2.5">
                      <div>Role: <strong className="text-white">{detailTicket.user_id?.role || 'user'}</strong></div>
                      <div>Joined: <strong className="text-white">{detailTicket.user_id?.createdAt ? new Date(detailTicket.user_id.createdAt).toLocaleDateString() : '—'}</strong></div>
                      <div className="flex justify-between border-t border-[#222] pt-1.5 mt-1">
                        <span>Total Tickets: <strong className="text-white">{detailTicket.user_id?.totalTicketsSubmitted || 1}</strong></span>
                        <span className={detailTicket.user_id?.previousRejectedTickets > 0 ? 'text-[#f87171]' : 'text-[#acacac]'}>
                          Rejects Flag: <strong>{detailTicket.user_id?.previousRejectedTickets || 0}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Current Status Badge */}
                  <div>
                    <span className="text-[11px] text-[#888] block mb-1 uppercase">Approval State</span>
                    {getApprovalBadge(detailTicket.approvalStatus)}
                    {detailTicket.moderationNote && (
                      <div className="mt-2 bg-[#1c1917] border border-[#292524] p-2.5 rounded-md text-xs text-[#fb923c]">
                        <span className="font-semibold block text-[10px] text-[#a8a29e] uppercase">Note / Reason:</span>
                        {detailTicket.moderationNote}
                      </div>
                    )}
                  </div>

                  {/* Quick Action Decision Form */}
                  <div className="border-t border-[#222] pt-4">
                    <h4 className="text-[13px] text-white font-semibold mb-3">Moderator Verdict</h4>
                    
                    <label className="text-[11px] text-[#888] block mb-1.5">Action Reason / Note (visible to user)</label>
                    <textarea
                      className="w-full min-h-[90px] bg-[#111] border border-[#3a3a3a] rounded-lg text-[#e4e4e4] p-3 text-[13px] outline-none resize-none mb-4 font-sans"
                      placeholder="Add moderation reasoning..."
                      value={moderationNoteInput}
                      onChange={(e) => setModerationNoteInput(e.target.value)}
                    />

                    <div className="flex flex-col gap-2">
                      {detailTicket.approvalStatus !== 'approved' && (
                        <button
                          onClick={() => handleSingleAction(detailTicket._id, 'restore')}
                          className="btn btn-sm bg-[#86efac] text-black border-none w-full font-semibold"
                        >
                          Restore & Approve Ticket
                        </button>
                      )}
                      
                      {detailTicket.approvalStatus === 'approved' && (
                        <button
                          onClick={() => handleSingleAction(detailTicket._id, 'suspend', moderationNoteInput)}
                          className="btn btn-sm bg-[#fb923c] text-black border-none w-full font-semibold"
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
                          className="btn btn-sm bg-[#f87171] text-black border-none w-full font-semibold"
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
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.85)] backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-6 w-full max-w-[440px] shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
            <h3 className="text-white text-base m-0 mb-2 font-semibold capitalize">
              {actionType.replace('-', ' ')}
            </h3>
            <p className="text-[#acacac] text-xs m-0 mb-4">
              {actionType.includes('reject')
                ? 'A rejection note explaining the decision is required (minimum 10 characters).'
                : 'Enter a moderation note to explain why this ticket is being suspended.'
              }
            </p>

            <textarea
              className="w-full min-h-[90px] bg-[#111] border border-[#3a3a3a] rounded-lg text-[#e4e4e4] p-3 text-[13px] outline-none resize-none mb-4 font-sans"
              placeholder="Reasoning here…"
              value={modalNote}
              onChange={(e) => setModalNote(e.target.value)}
              required
            />

            <div className="flex gap-2 justify-self-stretch justify-end">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setActioningTicketId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn btn-sm text-[#0a0a0a] border-none cursor-pointer font-semibold ${actionType.includes('reject') ? 'bg-[#f87171]' : 'bg-[#fb923c]'}`}
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
