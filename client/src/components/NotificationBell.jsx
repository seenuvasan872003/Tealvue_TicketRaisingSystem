// ============================================================
//  client/src/components/NotificationBell.jsx
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, X } from 'lucide-react';
import { notificationApi } from '../services/notificationApi';
import logger from '../utils/logger';

const relativeTime = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (mins < 1)    return 'just now';
  if (mins < 60)   return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  return `${days}d ago`;
};

const typeColorMap = {
  TICKET_CREATED: '#eac253',                // gold
  TICKET_VIEWED_BY_ADMIN: '#93c5fd',        // blue
  TICKET_ALLOCATED_TO_TEAM: '#67e8f9',      // cyan
  TICKET_VIEWED_BY_TEAM_ADMIN: '#2dd4bf',   // teal
  TICKET_ALLOCATED_TO_TEAM_USER: '#eac253', // gold
  TICKET_VIEWED_BY_TEAM_USER: '#93c5fd',     // blue
  TICKET_RESOLVED: '#86efac',               // green
};

import { getCache, setCache } from '../utils/cache';

const NotificationBell = () => {
  const [unreadCount, setUnreadCount] = useState(() => getCache('unread_count') || 0);
  const [notifications, setNotifications] = useState(() => {
    const cached = getCache('notifications');
    return Array.isArray(cached) ? cached : [];
  });
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);
  const navigate = useNavigate();

  // Poll unread count every 30 seconds
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const res = await notificationApi.getUnreadCount();
      setUnreadCount(res.data.count);
      setCache('unread_count', res.data.count, 1);
    } catch (err) {
      logger.error('NotificationBell', 'fetchUnreadCount', 'Error fetching unread count', err, { api: '/api/notifications/unread-count', method: 'GET', action: 'Unread Count Fetch Failure' });
      console.error('Error fetching unread count:', err);
    }
  };

  const fetchNotifications = async () => {
    logger.info('NotificationBell', 'fetchNotifications', 'Fetching notifications dropdown', { api: '/api/notifications', method: 'GET', action: 'Notification Bell Open' });
    try {
      // Only show loading indicator if cache is empty
      if (notifications.length === 0) {
        setLoading(true);
      }
      const res = await notificationApi.getAll(1);
      const notifs = res.data.notifications || [];
      setNotifications(notifs);
      setUnreadCount(res.data.unreadCount || 0);
      setCache('notifications', notifs, 1);
      setCache('unread_count', res.data.unreadCount || 0, 1);
    } catch (err) {
      logger.error('NotificationBell', 'fetchNotifications', 'Error fetching notifications', err, { api: '/api/notifications', method: 'GET', action: 'Notifications Fetch Failure' });
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBellClick = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      fetchNotifications();
    }
  };

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    logger.info('NotificationBell', 'handleMarkAllRead', 'Marking all notifications as read', { api: '/api/notifications/mark-all-read', method: 'PUT', action: 'Mark All Read' });
    try {
      await notificationApi.markAllRead();
      const updated = notifications.map(n => ({ ...n, isRead: true }));
      setNotifications(updated);
      setUnreadCount(0);
      setCache('notifications', updated, 1);
      setCache('unread_count', 0, 1);
    } catch (err) {
      logger.error('NotificationBell', 'handleMarkAllRead', 'Error marking all notifications read', err, { api: '/api/notifications/mark-all-read', method: 'PUT', action: 'Mark All Read Failure' });
      console.error('Error marking all read:', err);
    }
  };

  const handleItemClick = async (notif) => {
    try {
      if (!notif.isRead) {
        await notificationApi.markRead(notif._id);
        const updated = notifications.map(n => n._id === notif._id ? { ...n, isRead: true } : n);
        setNotifications(updated);
        const newCount = Math.max(0, unreadCount - 1);
        setUnreadCount(newCount);
        setCache('notifications', updated, 1);
        setCache('unread_count', newCount, 1);
        logger.info('NotificationBell', 'handleItemClick', `Notification marked as read: ${notif._id}`, { api: `/api/notifications/${notif._id}/read`, method: 'PUT', action: 'Notification Mark Read' });
      }
      if (notif.ticketId) {
        logger.info('NotificationBell', 'handleItemClick', `Navigating to ticket: ${notif.ticketId}`, { action: 'Notification Click Navigate' });
        navigate(`/tickets/${notif.ticketId}`);
      }
      setIsOpen(false);
    } catch (err) {
      logger.error('NotificationBell', 'handleItemClick', 'Error handling notification click', err, { api: `/api/notifications/${notif._id}/read`, method: 'PUT', action: 'Notification Click Failure' });
      console.error('Error handling notification click:', err);
    }
  };

  return (
    <div className="notif-bell-wrap" ref={wrapRef}>
      {/* Bell Icon Button */}
      <button
        id="notification-bell"
        className="notif-bell-btn"
        onClick={handleBellClick}
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="notif-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="notif-dropdown">
          {/* Header row */}
          <div className="notif-header">
            <span>Notifications {unreadCount > 0 && `(${unreadCount})`}</span>
            <div className="flex gap-3 items-center">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="bg-transparent border-none text-[11px] text-[#d3a73c] cursor-pointer p-0 font-medium outline-none"
                >
                  Mark all read
                </button>
              )}
              <button
                className="notif-close-mobile bg-transparent border-none text-[#acacac] cursor-pointer p-0 flex items-center"
                onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* List container */}
          <div className="notif-list">
            {loading ? (
              <div className="notif-empty">Loading...</div>
            ) : notifications.length === 0 ? (
              /* Empty state */
              <div className="notif-empty py-8 px-4 text-center">
                <div className="text-[#2d2d2d] text-3xl mb-2">
                  <BellOff size={32} color="#2d2d2d" className="mx-auto" />
                </div>
                <div className="text-[#555] text-[13px]">
                  No notifications yet
                </div>
              </div>
            ) : (
              notifications.map((n) => (
                /* Notification item */
                <div
                  key={n._id}
                  className={`notif-item flex gap-[10px] items-start ${!n.isRead ? 'unread border-l-2 border-[#d3a73c]' : 'border-l-2 border-transparent'}`}
                  onClick={() => handleItemClick(n)}
                >
                  {/* Left: color dot */}
                  <div
                    className="w-3 h-3 rounded-full mt-[3px] shrink-0"
                    style={{ backgroundColor: typeColorMap[n.type] || '#666' }}
                  />

                  {/* Middle: text and metadata */}
                  <div className="flex-1">
                    <div className="notif-item-msg text-xs text-[#e4e4e4] leading-relaxed break-words">
                      {n.message}
                    </div>
                    <div className="notif-item-time text-[11px] text-[#666] mt-1">
                      by {n.senderName || 'System'} · {relativeTime(n.createdAt)}
                    </div>
                  </div>

                  {/* Right: unread dot */}
                  {!n.isRead && (
                    <div className="notif-dot bg-[#d3a73c] shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 text-center border-t border-[#2d2d2d] bg-[#111]">
            <button
              onClick={() => {
                navigate('/notifications');
                setIsOpen(false);
              }}
              className="bg-transparent border-none text-[#d3a73c] text-xs cursor-pointer font-medium p-0 outline-none"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
