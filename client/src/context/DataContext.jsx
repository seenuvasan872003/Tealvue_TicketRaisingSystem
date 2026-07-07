// ============================================================
//  client/src/context/DataContext.jsx  —  Preloaded Data Context
// ============================================================

import { createContext, useContext, useState, useEffect } from 'react';
import { getCache } from '../utils/cache';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
  const { user } = useAuth();
  const [dataState, setDataState] = useState({
    profile: null,
    tickets: [],
    users: [],
    teams: [],
    notifications: [],
    unreadCount: 0,
    dashboardStats: null,
    agenciesDash: null,
    activityLogs: [],
    features: [],
    isPreloaded: false
  });

  // Re-reads preloaded records from cache utility
  const refreshFromCache = () => {
    if (!user) {
      setDataState({
        profile: null,
        tickets: [],
        users: [],
        teams: [],
        notifications: [],
        unreadCount: 0,
        dashboardStats: null,
        agenciesDash: null,
        activityLogs: [],
        features: [],
        isPreloaded: false
      });
      return;
    }

    const role = user.role;
    let ticketsCacheKey = 'all_tickets';
    if (role === 'team_user') ticketsCacheKey = 'assigned_tickets';
    if (role === 'user') ticketsCacheKey = 'my_tickets';

    let statsCacheKey = 'dashboard_stats';
    if (role === 'user') statsCacheKey = 'my_stats';

    setDataState({
      profile: getCache('profile'),
      tickets: getCache(ticketsCacheKey) || [],
      users: getCache('all_users') || [],
      teams: getCache('teams_list') || [],
      notifications: getCache('notifications') || [],
      unreadCount: getCache('unread_count') || 0,
      dashboardStats: getCache(statsCacheKey) || null,
      agenciesDash: getCache('agencies_dashboard') || null,
      activityLogs: getCache('activity_logs') || [],
      features: getCache('role_features') || [],
      isPreloaded: !!getCache('profile')
    });
  };

  useEffect(() => {
    refreshFromCache();
  }, [user]);

  return (
    <DataContext.Provider value={{ ...dataState, setData: setDataState, refreshFromCache }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
};
export default DataContext;
