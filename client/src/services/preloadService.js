// ============================================================
//  client/src/services/preloadService.js  —  Data Preload Service
// ============================================================

import { fetchProfile } from './authApi';
import { getMyNotifications, getUnreadCount } from './notificationApi';
import {
  getTickets,
  getTeams,
  getTeamsDashboard,
  getMyStats
} from './ticketApi';
import { getAllUsers } from './userApi';
import { callFeatureApi } from './apiResolver';
import API from './authApi';
import { setCache } from '../utils/cache';

/**
 * Preloads all data relevant to the logged-in user's role.
 * Updates progress state as data is loaded.
 * @param {object} user - The user object returned by login API
 * @param {function} onProgress - Callback function(progressPct, statusText)
 */
export const preloadByRole = async (user, onProgress) => {
  if (!user) return;
  const role = user.role;

  // 1. Define base requests required by all roles
  // Uses 'select' mapping to pick specific arrays or fields to store in cache.
  const requests = [
    { key: 'profile', call: fetchProfile(), ttl: 30, text: 'Loading profile...' },
    { key: 'notifications', call: getMyNotifications(), ttl: 1, text: 'Fetching notifications...', select: (data) => data?.notifications || [] },
    { key: 'unread_count', call: getUnreadCount(), ttl: 1, text: 'Syncing notifications count...', select: (data) => data?.count || 0 },
    { key: 'role_features', call: API.get('/role-features/me'), ttl: 30, text: 'Verifying permissions...', select: (data) => data?.features || [] }
  ];

  // 2. Define role-specific requests using real, existing functions
  if (role === 'super-admin') {
    requests.push(
      { key: 'all_users', call: getAllUsers(), ttl: 10, text: 'Loading users directory...', select: (data) => data?.users || [] },
      { key: 'teams_list', call: getTeams(), ttl: 15, text: 'Loading specialized support teams...', select: (data) => data?.teams || data || [] },
      { key: 'all_tickets', call: getTickets(), ttl: 3, text: 'Fetching tickets list...', select: (data) => data?.tickets || [] },
      { key: 'ticket_approval', call: callFeatureApi('ticket_approval', role, 'GET', null, { page: 1, limit: 20 }), ttl: 3, text: 'Syncing ticket approvals...', select: (data) => data?.tickets || [] },
      { key: 'agencies_dashboard', call: getTeamsDashboard(), ttl: 5, text: 'Loading agency insights...' },
      { key: 'activity_logs', call: API.get('/logs?range=daily'), ttl: 5, text: 'Syncing system logs...' },
      { key: 'role_features_all', call: API.get('/super-admin/role-features'), ttl: 30, text: 'Retrieving security policies...' }
    );
  } else if (role === 'admin') {
    requests.push(
      { key: 'all_tickets', call: getTickets(), ttl: 3, text: 'Fetching tickets list...', select: (data) => data?.tickets || [] },
      { key: 'all_users', call: getAllUsers(), ttl: 10, text: 'Loading users directory...', select: (data) => data?.users || [] },
      { key: 'agencies_dashboard', call: getTeamsDashboard(), ttl: 5, text: 'Loading agency insights...' },
      { key: 'activity_logs', call: API.get('/logs?range=daily'), ttl: 5, text: 'Syncing system logs...' },
      { key: 'teams_list', call: getTeams(), ttl: 15, text: 'Loading specialized support teams...', select: (data) => data?.teams || data || [] }
    );
  } else if (role === 'team_admin') {
    requests.push(
      { key: 'all_tickets', call: getTickets(), ttl: 3, text: 'Syncing team tickets...', select: (data) => data?.tickets || [] },
      { key: 'my_team', call: API.get('/teams/mine'), ttl: 15, text: 'Loading team directory...' },
      { key: 'activity_logs', call: API.get('/logs?range=daily'), ttl: 5, text: 'Fetching activity logs...' }
    );
  } else if (role === 'team_user') {
    requests.push(
      { key: 'assigned_tickets', call: getTickets({ page: 1, limit: 10 }), ttl: 3, text: 'Syncing assigned tickets...', select: (data) => data?.tickets || [] },
      { key: 'my_team', call: API.get('/teams/mine'), ttl: 15, text: 'Syncing agent workspace...' }
    );
  } else if (role === 'user') {
    requests.push(
      { key: 'my_tickets', call: getTickets(), ttl: 3, text: 'Fetching my tickets...', select: (data) => data?.tickets || [] },
      { key: 'my_stats', call: getMyStats(), ttl: 5, text: 'Loading dashboard statistics...' }
    );
  }

  const total = requests.length;
  let completed = 0;

  onProgress(10, 'Initializing workspace...');

  // Fire all requests concurrently using Promise.allSettled
  const results = await Promise.allSettled(
    requests.map(async (req) => {
      try {
        const res = await req.call;
        completed++;
        const pct = Math.min(90, Math.round((completed / total) * 100));
        onProgress(pct, req.text);
        
        // Format response data according to selectors
        const formatted = req.select ? req.select(res.data) : res.data;
        return { key: req.key, data: formatted, ttl: req.ttl };
      } catch (err) {
        completed++;
        const pct = Math.min(90, Math.round((completed / total) * 100));
        onProgress(pct, `Unable to load some data: ${req.key}`);
        console.warn(`Preload failed for ${req.key}:`, err);
        return { key: req.key, failed: true };
      }
    })
  );

  // Store successfully fulfilled requests in cache
  results.forEach((item) => {
    if (item.status === 'fulfilled' && !item.value.failed) {
      setCache(item.value.key, item.value.data, item.value.ttl);
    }
  });

  onProgress(100, 'Done!');
};
