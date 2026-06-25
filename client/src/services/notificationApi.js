// ============================================================
//  client/src/services/notificationApi.js  —  Notifications API
// ============================================================

import axios from './authApi';

// Named exports for backward compatibility
export const getMyNotifications = (page = 1) => axios.get(`/notifications?page=${page}&limit=20`);
export const getUnreadCount     = ()         => axios.get('/notifications/unread-count');
export const markAsRead         = (id)       => axios.put(`/notifications/${id}/read`);
export const markAllRead        = ()         => axios.put('/notifications/mark-all-read');
export const deleteNotification = (id)       => axios.delete(`/notifications/${id}`);

// Object export for new API design
export const notificationApi = {
  getAll:          getMyNotifications,
  getUnreadCount:  getUnreadCount,
  markRead:        markAsRead,
  markAllRead:     markAllRead,
  remove:          deleteNotification
};
