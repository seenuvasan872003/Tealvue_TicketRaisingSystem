// ============================================================
//  client/src/pages/Notifications.jsx
// ============================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, Check, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
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

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'unread', 'read'
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const LIMIT = 20;

  useEffect(() => {
    loadNotifications();
  }, [page, activeTab]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationApi.getAll(page);
      const allNotifs = res.data.notifications || [];
      setUnreadCount(res.data.unreadCount || 0);

      // Client-side tab filter because the API returns all, or we can filter it here
      let filtered = allNotifs;
      if (activeTab === 'unread') {
        filtered = allNotifs.filter(n => !n.isRead);
      } else if (activeTab === 'read') {
        filtered = allNotifs.filter(n => n.isRead);
      }

      setNotifications(filtered);
      // Approximate pages based on active set or total count
      const totalCount = activeTab === 'all' 
        ? allNotifs.length + (res.data.unreadCount > allNotifs.filter(n => !n.isRead).length ? res.data.unreadCount : 0) // rough estimate
        : filtered.length;
      
      setTotalPages(Math.max(1, Math.ceil(totalCount / LIMIT)));
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await notificationApi.markRead(id);
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(c => Math.max(0, c - 1));
      // If we are on the unread tab, remove it from the list
      if (activeTab === 'unread') {
        setNotifications(prev => prev.filter(n => n._id !== id));
      }
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true }))
      );
      setUnreadCount(0);
      if (activeTab === 'unread') {
        setNotifications([]);
      }
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await notificationApi.remove(id);
      setNotifications(prev => prev.filter(n => n._id !== id));
      // Refresh count
      const countRes = await notificationApi.getUnreadCount();
      setUnreadCount(countRes.data.count);
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const handleItemClick = async (notif) => {
    if (!notif.isRead) {
      await handleMarkRead(notif._id);
    }
    if (notif.ticketId) {
      navigate(`/tickets/${notif.ticketId}`);
    }
  };

  return (
    <div className="page-body fade-in" style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#e4e4e4', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bell size={24} color="#d3a73c" /> Notifications
            {unreadCount > 0 && (
              <span style={{ fontSize: '12px', background: '#f87171', color: '#000', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                {unreadCount} new
              </span>
            )}
          </h1>
          <p style={{ fontSize: '13px', color: '#666', marginTop: '4px', margin: 0 }}>
            Audit log of all lifecycle events and assignments.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            style={{
              background: '#1a1a1a',
              border: '0.5px solid #2d2d2d',
              color: '#d3a73c',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#222'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#1a1a1a'}
          >
            <Check size={14} /> Mark all read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '0.5px solid #2d2d2d', marginBottom: '20px', gap: '24px' }}>
        {['all', 'unread', 'read'].map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setPage(1); }}
              style={{
                background: 'none',
                border: 'none',
                padding: '12px 4px',
                color: isActive ? '#e4e4e4' : '#555',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                borderBottom: isActive ? '2px solid #d3a73c' : '2px solid transparent',
                textTransform: 'capitalize',
                transition: 'color 0.2s, border-color 0.2s',
                outline: 'none',
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ background: '#111', borderRadius: '10px', border: '0.5px solid #2d2d2d', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#666' }}>
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: '64px 16px', textAlign: 'center' }}>
            <BellOff size={48} color="#2d2d2d" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ color: '#888', fontSize: '16px', fontWeight: 500, margin: '0 0 8px' }}>
              No notifications found
            </h3>
            <p style={{ color: '#555', fontSize: '13px', margin: 0 }}>
              {activeTab === 'unread' ? 'You have read all your notifications!' : 'Your notification log is currently empty.'}
            </p>
          </div>
        ) : (
          <div>
            {notifications.map((n) => (
              <div
                key={n._id}
                onClick={() => handleItemClick(n)}
                style={{
                  padding: '16px 20px',
                  borderBottom: '0.5px solid #1a1a1a',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  background: n.isRead ? 'transparent' : 'rgba(211, 167, 60, 0.02)',
                  borderLeft: n.isRead ? '3px solid transparent' : '3px solid #d3a73c',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.015)'}
                onMouseLeave={(e) => e.currentTarget.style.background = n.isRead ? 'transparent' : 'rgba(211, 167, 60, 0.02)'}
              >
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flex: 1, marginRight: '16px' }}>
                  {/* Color dot */}
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: typeColorMap[n.type] || '#666',
                      marginTop: '4px',
                      flexShrink: 0,
                    }}
                  />

                  {/* Message body */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', color: '#e4e4e4', lineHeight: 1.6 }}>
                      {n.message}
                    </div>
                    
                    {/* Ticket title row */}
                    {n.ticketTitle && (
                      <div style={{ color: '#d3a73c', fontSize: '11px', marginTop: '6px', fontWeight: 500 }}>
                        Ticket: {n.ticketTitle}
                      </div>
                    )}
                    
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '6px' }}>
                      by {n.senderName || 'System'} ({n.senderRole || 'system'}) · {relativeTime(n.createdAt)}
                    </div>
                  </div>
                </div>

                {/* Actions on right side */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} onClick={(e) => e.stopPropagation()}>
                  {!n.isRead && (
                    <button
                      onClick={() => handleMarkRead(n._id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#d3a73c',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: 500,
                        padding: '4px 8px',
                        borderRadius: '4px',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(211,167,60,0.08)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    >
                      Mark read
                    </button>
                  )}
                  <button
                    onClick={(e) => handleDelete(n._id, e)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#555',
                      cursor: 'pointer',
                      padding: '8px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'color 0.2s, background 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#f87171';
                      e.currentTarget.style.background = 'rgba(248,113,113,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#555';
                      e.currentTarget.style.background = 'none';
                    }}
                    title="Delete notification"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '24px', gap: '16px' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              background: '#111',
              border: '0.5px solid #2d2d2d',
              color: page === 1 ? '#444' : '#e4e4e4',
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              padding: '8px 12px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              outline: 'none',
            }}
          >
            <ChevronLeft size={16} />
          </button>
          
          <span style={{ fontSize: '13px', color: '#888' }}>
            Page {page} of {totalPages}
          </span>

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              background: '#111',
              border: '0.5px solid #2d2d2d',
              color: page === totalPages ? '#444' : '#e4e4e4',
              cursor: page === totalPages ? 'not-allowed' : 'pointer',
              padding: '8px 12px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              outline: 'none',
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Notifications;
