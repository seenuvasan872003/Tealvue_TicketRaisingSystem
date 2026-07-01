import { useState, useEffect } from 'react';
import {
  Activity,
  User,
  Clock,
  Terminal,
  Search,
} from 'lucide-react';
import API from '../services/authApi';
import { toast } from 'react-toastify';
import logger from '../utils/logger';

const ClientLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 12;

  const [filterType, setFilterType] = useState('all'); // 'all', 'login', 'initialized', 'warning', 'error'
  const [statusCodeFilter, setStatusCodeFilter] = useState('all');

  const fetchClientLogs = async () => {
    logger.initialize('ClientLogs Module');
    try {
      setLoading(true);
      const { data } = await API.get('/logs/client');
      setLogs(data || []);
      logger.success('ClientLogs', 'fetchClientLogs', 'Client database logs fetched successfully');
    } catch (err) {
      logger.error('ClientLogs', 'fetchClientLogs', 'Failed to fetch client logs', err);
      toast.error('Failed to load client database logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientLogs();
  }, []);

  // Compute unique status codes present in log dataset for filter select options
  const availableStatusCodes = Array.from(
    new Set(
      logs
        .map(l => l.status)
        .filter(s => s !== undefined && s !== null && s !== '—' && s !== '')
    )
  ).sort();

  const filteredLogs = logs.filter(log => {
    const s = search.toLowerCase();
    
    // Quick Category filtering
    if (filterType === 'login') {
      const isLogin = log.action === 'Login Success' || log.message?.includes('[API SUCCESS] POST /api/auth/login');
      if (!isLogin) return false;
    } else if (filterType === 'initialized') {
      const isInit = log.action === 'App Initialization' || log.message?.includes('Initialized');
      if (!isInit) return false;
    } else if (filterType === 'warning') {
      if (log.level !== 'warn') return false;
    } else if (filterType === 'error') {
      if (log.level !== 'error') return false;
    }

    // Status Code filtering
    if (statusCodeFilter !== 'all') {
      if (String(log.status) !== String(statusCodeFilter)) return false;
    }

    return (
      log.message?.toLowerCase().includes(s) ||
      log.component?.toLowerCase().includes(s) ||
      log.file?.toLowerCase().includes(s) ||
      log.user?.toLowerCase().includes(s) ||
      log.level?.toLowerCase().includes(s) ||
      String(log.status).toLowerCase().includes(s)
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage) || 1;
  const currentLogs = filteredLogs.slice(
    (currentPage - 1) * logsPerPage,
    currentPage * logsPerPage
  );

  return (
    <div className="page-body fade-in">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Client Database Logs</h1>
          <p className="page-subtitle">View active logs initialized by users, client events, and exceptions.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', width: '100%', maxWidth: 460 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder="Search client logs..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              style={{
                background: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                color: 'var(--color-text)',
                fontSize: 13,
                padding: '8px 12px 8px 36px',
                width: '100%',
                outline: 'none',
              }}
            />
          </div>
          <select
            value={statusCodeFilter}
            onChange={(e) => { setStatusCodeFilter(e.target.value); setCurrentPage(1); }}
            style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              color: 'var(--color-text)',
              fontSize: 13,
              padding: '8px 12px',
              width: 140,
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Status Codes</option>
            {availableStatusCodes.map(code => (
              <option key={code} value={code}>Status {code}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20, background: '#161b22', padding: 4, borderRadius: 8, width: 'max-content' }}>
        {[
          { label: 'All Logs', value: 'all' },
          { label: 'Login', value: 'login' },
          { label: 'Initialized', value: 'initialized' },
          { label: 'Warning', value: 'warning' },
          { label: 'Error', value: 'error' },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => { setFilterType(tab.value); setCurrentPage(1); }}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              background: filterType === tab.value ? 'var(--color-teal)' : 'transparent',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && logs.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" /></div>
      ) : filteredLogs.length === 0 ? (
        <div className="card empty-state" style={{ padding: '60px 40px', textAlign: 'center', background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12 }}>
          <Terminal size={40} style={{ color: 'var(--color-text-muted)', marginBottom: 12, opacity: 0.5 }} />
          <h3 style={{ fontSize: 16, color: '#fff', margin: '0 0 4px 0' }}>No client logs found</h3>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>No matches found for your filter criteria.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {currentLogs.map((log) => {
            const levelColor = log.level === 'error' ? '#ef4444' : log.level === 'warn' ? '#eac253' : '#3b82f6';
            return (
              <div
                key={log._id}
                style={{
                  background: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 12,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        background: `rgba(${parseInt(levelColor.slice(1,3),16)}, ${parseInt(levelColor.slice(3,5),16)}, ${parseInt(levelColor.slice(5,7),16)}, 0.1)`,
                        color: levelColor,
                        border: `1px solid rgba(${parseInt(levelColor.slice(1,3),16)}, ${parseInt(levelColor.slice(3,5),16)}, ${parseInt(levelColor.slice(5,7),16)}, 0.25)`,
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                      }}
                    >
                      {log.level}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
                      {log.component || 'Global'} &rarr; {log.function || 'root'}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={11} /> {log.timestamp}
                  </span>
                </div>

                <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 13, color: '#e4e4e4', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {log.message}
                  </div>
                  {log.stack && log.stack !== '—' && (
                    <div style={{ fontSize: 11, color: '#ff7878', fontFamily: 'monospace', whiteSpace: 'pre-wrap', borderTop: '1px solid var(--color-border)', marginTop: 8, paddingTop: 8, maxHeight: 150, overflowY: 'auto' }}>
                      {log.stack}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11, color: 'var(--color-text-muted)', marginTop: 8 }}>
                  <span>
                    <strong>User:</strong>{' '}
                    {log.userId && typeof log.userId === 'object'
                      ? log.userId.name || log.userId.email
                      : log.user || 'Anonymous'}
                  </span>
                  {log.userId && typeof log.userId !== 'object' && log.userId !== 'None' && (
                    <span><strong>User ID:</strong> {log.userId}</span>
                  )}
                  {log.userId && typeof log.userId === 'object' && log.userId._id && (
                    <span><strong>User ID:</strong> {log.userId._id}</span>
                  )}
                  <span>
                    <strong>File Location:</strong>{' '}
                    {(() => {
                      if (log.stack && log.stack !== '—') {
                        // Extract file name and line number from the first stack frame containing http://localhost:5173
                        const lines = log.stack.split('\n');
                        for (let line of lines) {
                          if (line.includes('http://localhost:5173')) {
                            const match = line.match(/\/src\/([^\?]+)\?t=\d+:(\d+):\d+/);
                            if (match) {
                              return `${match[1]} (Line: ${match[2]})`;
                            }
                            const matchFallback = line.match(/\/src\/([^:]+):(\d+)/);
                            if (matchFallback) {
                              return `${matchFallback[1]} (Line: ${matchFallback[2]})`;
                            }
                          }
                        }
                      }
                      return log.file || 'Unknown';
                    })()}
                  </span>
                  <span><strong>Route:</strong> {log.route}</span>
                  {log.action && log.action !== '—' && (
                    <span><strong>User Action:</strong> {log.action}</span>
                  )}
                  {log.api && log.api !== '—' && (
                    <span style={{ color: log.status >= 400 ? '#f85149' : 'var(--color-teal)' }}>
                      <strong>API Trigger:</strong> {log.method} {log.api} (Status: {log.status})
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 12 }}>
              <button
                className="btn btn-ghost"
                style={{ padding: '6px 14px', fontSize: 12 }}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                &larr; Previous
              </button>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="btn btn-ghost"
                style={{ padding: '6px 14px', fontSize: 12 }}
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >
                Next &rarr;
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClientLogs;
