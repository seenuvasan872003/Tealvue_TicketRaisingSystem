// ============================================================
//  client/src/services/ticketApi.js  —  Ticket API Service
// ============================================================

import API from './authApi';

// ── Tickets ────────────────────────────────────────────────
export const getTickets    = (params) => API.get('/tickets', { params });
export const getTicketById = (id)     => API.get(`/tickets/${id}`);

// createTicket supports multipart/form-data for attachments
export const createTicket = (formData) =>
  API.post('/tickets', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const updateTicket = (id, data) => API.put(`/tickets/${id}`, data);
export const deleteTicket = (id)       => API.delete(`/tickets/${id}`);

// Internal notes (admin/super-admin only)
export const addInternalNote = (id, data) => API.post(`/tickets/${id}/notes`, data);

// ── Stats ──────────────────────────────────────────────────
export const getAdminStats = () => API.get('/tickets/stats');
export const getMyStats    = () => API.get('/tickets/my-stats');

// ── Chart data (Phase 2 backend endpoints) ──────────────────
export const getGrowthData      = () => API.get('/tickets/growth');
export const getStatusBreakdown = () => API.get('/tickets/breakdown');
export const getAdminWorkload   = () => API.get('/tickets/workload');

// ── Comments ───────────────────────────────────────────────
export const getComments = (ticketId) => API.get(`/comments/${ticketId}`);
export const addComment  = (data)     => API.post('/comments', data);

// ── Teams & Members ─────────────────────────────────────────
export const getTeams             = () => API.get('/teams');
export const getMyTeam            = () => API.get('/teams/mine');
export const getTeamById          = (id) => API.get(`/teams/${id}`);
export const createTeam           = (data) => API.post('/teams', data);
export const updateTeam           = (id, data) => API.put(`/teams/${id}`, data);
export const deleteTeam           = (id) => API.delete(`/teams/${id}`);
export const getTeamsDashboard    = () => API.get('/teams/dashboard');
export const getTeamMembers       = (teamId) => API.get(`/teams/${teamId}/members`);
export const addTeamMember        = (teamId, data) => API.post(`/teams/${teamId}/members`, data);
export const deleteTeamMember     = (teamId, uid) => API.delete(`/teams/${teamId}/members/${uid}`);
export const getTeamPerformance   = (teamId) => API.get(`/teams/${teamId}/performance`);

export const assignTicketTeam     = (id, teamId) => API.put(`/tickets/${id}/assign-team`, { teamId });
export const assignTicketMember   = (id, userId) => API.put(`/tickets/${id}/assign-member`, { userId });
export const closeTicket          = (id) => API.put(`/tickets/${id}/close`);
export const updateTicketDueDate  = (id, dueDate) => API.put(`/tickets/${id}/due-date`, { dueDate });

export const updateTicketStatus   = (id, status) => API.put(`/tickets/${id}/status`, { status });
export const updateTicketPriority = (id, priority) => API.put(`/tickets/${id}/priority`, { priority });

// ── Lifecycle Logs & Time Tracking ────────────────────────
export const getTicketLogs        = (id) => API.get(`/tickets/${id}/logs`);
export const getTicketTimeSummary = (id) => API.get(`/tickets/${id}/time-summary`);
export const getAllTicketLogs     = ()   => API.get('/tickets/logs/all');

export const setTicketCategory    = (id, category) => API.put(`/tickets/${id}/set-category`, { category });
export const declineTicket        = (id, reason) => API.put(`/tickets/${id}/decline`, { reason });
export const reallocateTicketTeam = (id, newCategory, reason) => API.put(`/tickets/${id}/reallocate`, { newCategory, reason });
export const transferTicketToAdmin = (id, reason) => API.put(`/tickets/${id}/transfer-to-admin`, { reason });
export const restoreTicket = (id) => API.put(`/tickets/${id}/restore`);

// Get dynamic list of categories
export const getCategories = () => API.get('/teams/categories');
// Agency aliases for Team operations
export const createAgency = createTeam;
export const updateAgency = updateTeam;
export const deleteAgency = deleteTeam;
export const getAgenciesDashboard = getTeamsDashboard;
