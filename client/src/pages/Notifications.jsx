// ============================================================
//  client/src/pages/Notifications.jsx
// ============================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, Check, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
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

const Notifications = () => {
  const [notifications, setNotifications] = useState(() => {
    const cached = getCache('notifications');
    return Array.isArray(cached) ? cached : [];
  });
  const [unreadCount, setUnreadCount] = useState(() => getCache('unread_count') || 0);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'unread', 'read'
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(() => {
    const cached = getCache('notifications');
    return !Array.isArray(cached);
  });
  const navigate = useNavigate();

  const LIMIT = 20;

  useEffect(() => {
    loadNotifications();
  }, [page, activeTab]);

  const loadNotifications = async () => {
    if (page !== 1 || activeTab !== 'all') {
      setLoading(true);
    }
    logger.info('Notifications', 'loadNotifications', `Loading notifications — page: ${page} | tab: ${activeTab}`, { api: '/api/notifications', method: 'GET', action: 'Notifications Load Start' });
    try {
      const res = await notificationApi.getAll(page);
      const allNotifs = res.data.notifications || [];
      const currentUnread = res.data.unreadCount || 0;
      setUnreadCount(currentUnread);

      // Cache page 1 all notifications
      if (page === 1 && activeTab === 'all') {
        setCache('notifications', allNotifs, 1);
        setCache('unread_count', currentUnread, 1);
      }

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
      logger.info('Notifications', 'loadNotifications', `Notifications loaded — ${filtered.length} shown | ${res.data.unreadCount} unread`, {
        api: '/api/notifications', method: 'GET', status: 200, action: 'Notifications Load Success',
      });
    } catch (err) {
      logger.error('Notifications', 'loadNotifications', 'Error loading notifications', err, { api: '/api/notifications', method: 'GET', action: 'Notifications Load Failure' });
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
    <div className="page-body fade-in max-w-[1000px] mx-auto px-4 py-6">
      {/* Header section */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#e4e4e4] m-0 flex items-center gap-[10px]">
            <Bell size={24} color="#d3a73c" /> Notifications
            {unreadCount > 0 && (
              <span className="text-xs bg-[#f87171] text-black px-2 py-[2px] rounded-xl font-bold">
                {unreadCount} new
              </span>
            )}
          </h1>
          <p className="text-[13px] text-[#666] mt-1 m-0">
            Audit log of all lifecycle events and assignments.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="bg-[#1a1a1a] hover:bg-[#222] border-[0.5px] border-solid border-[#2d2d2d] text-[#d3a73c] px-4 py-2 rounded-md text-xs font-medium cursor-pointer flex items-center gap-[6px] transition-colors duration-200"
          >
            <Check size={14} /> Mark all read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b-[0.5px] border-solid border-[#2d2d2d] mb-5 gap-6">
        {['all', 'unread', 'read'].map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setPage(1); }}
              className={`bg-transparent border-none py-3 px-1 text-[14px] font-medium cursor-pointer capitalize transition-all duration-200 outline-none border-b-2 border-solid ${isActive ? 'text-[#e4e4e4] border-b-[#d3a73c]' : 'text-[#555] border-b-transparent'}`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="bg-[#111] rounded-[10px] border-[0.5px] border-solid border-[#2d2d2d] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-[#666]">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <BellOff size={48} color="#2d2d2d" className="mx-auto mb-4" />
            <h3 className="text-[#888] text-base font-medium m-0 mb-2">
              No notifications found
            </h3>
            <p className="text-[#555] text-[13px] m-0">
              {activeTab === 'unread' ? 'You have read all your notifications!' : 'Your notification log is currently empty.'}
            </p>
          </div>
        ) : (
          <div>
            {notifications.map((n) => (
              <div
                key={n._id}
                onClick={() => handleItemClick(n)}
                className={`px-5 py-4 border-b-[0.5px] border-solid border-b-[#1a1a1a] flex justify-between items-center cursor-pointer transition-colors duration-200 border-l-[3px] border-solid hover:bg-[rgba(255,255,255,0.015)] ${n.isRead ? 'bg-transparent border-l-transparent' : 'bg-[rgba(211,167,60,0.02)] border-l-[#d3a73c]'}`}
              >
                <div className="flex gap-4 items-start flex-1 mr-4">
                  {/* Color dot */}
                  <div
                    className="w-3 h-3 rounded-full mt-1 shrink-0"
                    style={{ backgroundColor: typeColorMap[n.type] || '#666' }}
                  />

                  {/* Message body */}
                  <div className="flex-1">
                    <div className="text-[13px] text-[#e4e4e4] leading-[1.6]">
                      {n.message}
                    </div>
                    
                    {/* Ticket title row */}
                    {n.ticketTitle && (
                      <div className="text-[#d3a73c] text-[11px] mt-[6px] font-medium">
                        Ticket: {n.ticketTitle}
                      </div>
                    )}
                    
                    <div className="text-[11px] text-[#666] mt-[6px]">
                      by {n.senderName || 'System'} ({n.senderRole || 'system'}) · {relativeTime(n.createdAt)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                  {!n.isRead && (
                    <button
                      onClick={() => handleMarkRead(n._id)}
                      className="bg-transparent border-none text-[#d3a73c] text-xs cursor-pointer font-medium px-2 py-1 rounded transition-colors duration-200 hover:bg-[rgba(211,167,60,0.08)]"
                    >
                      Mark read
                    </button>
                  )}
                  <button
                    onClick={(e) => handleDelete(n._id, e)}
                    className="bg-transparent border-none text-[#555] cursor-pointer p-2 rounded flex items-center justify-center transition-colors duration-200 hover:text-[#f87171] hover:bg-[rgba(248,113,113,0.08)]"
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
        <div className="flex justify-center items-center mt-6 gap-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className={`bg-[#111] border-[0.5px] border-solid border-[#2d2d2d] px-3 py-2 rounded-md flex items-center outline-none ${page === 1 ? 'text-[#444] cursor-not-allowed' : 'text-[#e4e4e4] cursor-pointer'}`}
          >
            <ChevronLeft size={16} />
          </button>
          
          <span className="text-[13px] text-[#888]">
            Page {page} of {totalPages}
          </span>

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className={`bg-[#111] border-[0.5px] border-solid border-[#2d2d2d] px-3 py-2 rounded-md flex items-center outline-none ${page === totalPages ? 'text-[#444] cursor-not-allowed' : 'text-[#e4e4e4] cursor-pointer'}`}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Notifications;
