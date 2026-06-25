// ============================================================
//  client/src/components/NotificationBell.jsx
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff } from 'lucide-react';
import { notificationApi } from '../services/notificationApi';

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

const NotificationBell = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
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
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationApi.getAll(1);
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
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
    try {
      await notificationApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  const handleItemClick = async (notif) => {
    try {
      if (!notif.isRead) {
        await notificationApi.markRead(notif._id);
        setNotifications(prev =>
          prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n)
        );
        setUnreadCount(c => Math.max(0, c - 1));
      }
      if (notif.ticketId) {
        navigate(`/tickets/${notif.ticketId}`);
      }
      setIsOpen(false);
    } catch (err) {
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
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '11px',
                  color: '#d3a73c',
                  cursor: 'pointer',
                  padding: 0,
                  fontWeight: 500,
                  outline: 'none',
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List container */}
          <div className="notif-list">
            {loading ? (
              <div className="notif-empty">Loading...</div>
            ) : notifications.length === 0 ? (
              /* Empty state */
              <div className="notif-empty" style={{ padding: '32px 16px', textAlign: 'center' }}>
                <div style={{ color: '#2d2d2d', fontSize: '32px', marginBottom: '8px' }}>
                  <BellOff size={32} color="#2d2d2d" style={{ margin: '0 auto' }} />
                </div>
                <div style={{ color: '#555', fontSize: '13px' }}>
                  No notifications yet
                </div>
              </div>
            ) : (
              notifications.map((n) => (
                /* Notification item */
                <div
                  key={n._id}
                  className={`notif-item ${!n.isRead ? 'unread' : ''}`}
                  onClick={() => handleItemClick(n)}
                  style={{
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'flex-start',
                    borderLeft: n.isRead ? '2px solid transparent' : '2px solid #d3a73c',
                  }}
                >
                  {/* Left: color dot */}
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: typeColorMap[n.type] || '#666',
                      marginTop: '3px',
                      flexShrink: 0,
                    }}
                  />

                  {/* Middle: text and metadata */}
                  <div style={{ flex: 1 }}>
                    <div className="notif-item-msg" style={{ fontSize: '12px', color: '#e4e4e4', lineHeight: 1.5, wordBreak: 'break-word' }}>
                      {n.message}
                    </div>
                    <div className="notif-item-time" style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                      by {n.senderName || 'System'} · {relativeTime(n.createdAt)}
                    </div>
                  </div>

                  {/* Right: unread dot */}
                  {!n.isRead && (
                    <div className="notif-dot" style={{ backgroundColor: '#d3a73c', flexShrink: 0 }} />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '10px 16px',
              textAlign: 'center',
              borderTop: '0.5px solid #2d2d2d',
              background: '#111',
            }}
          >
            <button
              onClick={() => {
                navigate('/notifications');
                setIsOpen(false);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#d3a73c',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 500,
                padding: 0,
                outline: 'none',
              }}
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
