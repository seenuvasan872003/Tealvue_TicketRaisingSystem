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
import { SkeletonCard } from '../components/skeletons';

import { getCache, setCache } from '../utils/cache';

const ClientLogs = () => {
  const [logs, setLogs] = useState(() => {
    const cached = getCache('client_logs');
    return Array.isArray(cached) ? cached : [];
  });
  const [loading, setLoading] = useState(() => {
    const cached = getCache('client_logs');
    return !Array.isArray(cached);
  });
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 12;

  const [filterType, setFilterType] = useState('all'); // 'all', 'login', 'initialized', 'warning', 'error'
  const [statusCodeFilter, setStatusCodeFilter] = useState('all');

  const fetchClientLogs = async () => {
    logger.initialize('ClientLogs Module');
    try {
      const cached = getCache('client_logs');
      if (!Array.isArray(cached) || cached.length === 0) {
        setLoading(true);
      }
      const { data } = await API.get('/logs/client');
      const list = data || [];
      setLogs(list);
      setCache('client_logs', list, 5);
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
      <div className="page-header mb-5 flex-wrap gap-4">
        <div>
          <h1 className="page-title">Client Database Logs</h1>
          <p className="page-subtitle">View active logs initialized by users, client events, and exceptions.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-[12px] items-center w-full sm:w-auto">
          <div className="relative w-full sm:flex">
            <Search size={15} className="absolute right-[10px] top-1/2 -translate-y-1/2 text-[#666] pointer-events-none" />
            <input
              type="text"
              placeholder="Search client logs..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="bg-[#1a1a1a] border border-solid border-[#4b4b4b] rounded-lg text-[#e4e4e4] text-[13px] h-[40px] py-0 pl-[12px] pr-[36px] w-full outline-none focus:border-[#d3a73c] transition-colors"
            />
          </div>
          <select
            value={statusCodeFilter}
            onChange={(e) => { setStatusCodeFilter(e.target.value); setCurrentPage(1); }}
            className="bg-[var(--color-card)] border border-solid border-[var(--color-border)] rounded-lg text-[var(--color-text)] text-[13px] px-3 h-[40px] w-full outline-none cursor-pointer"
          >
            <option value="all">All Status Codes</option>
            {availableStatusCodes.map(code => (
              <option key={code} value={code}>Status {code}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-5 bg-[#161b22] p-1 rounded-lg w-max">
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
            className={`px-[14px] py-[6px] rounded-md border-none text-white cursor-pointer text-xs font-semibold transition-all duration-200 ${filterType === tab.value ? 'bg-[var(--color-teal)]' : 'bg-transparent'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && logs.length === 0 ? (
        <div className="flex flex-col gap-3">
          <SkeletonCard height="80px" />
          <SkeletonCard height="80px" />
          <SkeletonCard height="80px" />
          <SkeletonCard height="80px" />
          <SkeletonCard height="80px" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="card empty-state px-10 py-[60px] text-center bg-[var(--color-card)] border border-solid border-[var(--color-border)] rounded-xl">
          <Terminal size={40} className="text-[var(--color-text-muted)] mb-3 opacity-50 mx-auto" />
          <h3 className="text-base text-white m-0 mb-1">No client logs found</h3>
          <p className="text-[13px] text-[var(--color-text-muted)] m-0">No matches found for your filter criteria.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {currentLogs.map((log) => {
            const levelColor = log.level === 'error' ? '#ef4444' : log.level === 'warn' ? '#eac253' : '#3b82f6';
            return (
              <div
                key={log._id}
                className="bg-[var(--color-card)] border border-solid border-[var(--color-border)] rounded-xl p-4 flex flex-col gap-[10px]"
              >
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-[2px] rounded text-[10px] font-bold uppercase border border-solid"
                      style={{
                        backgroundColor: `rgba(${parseInt(levelColor.slice(1,3),16)}, ${parseInt(levelColor.slice(3,5),16)}, ${parseInt(levelColor.slice(5,7),16)}, 0.1)`,
                        color: levelColor,
                        borderColor: `rgba(${parseInt(levelColor.slice(1,3),16)}, ${parseInt(levelColor.slice(3,5),16)}, ${parseInt(levelColor.slice(5,7),16)}, 0.25)`
                      }}
                    >
                      {log.level}
                    </span>
                    <span className="text-[13px] font-semibold text-white">
                      {log.component || 'Global'} &rarr; {log.function || 'root'}
                    </span>
                  </div>
                  <span className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-1">
                    <Clock size={11} /> {log.timestamp}
                  </span>
                </div>

                <div className="bg-[var(--color-surface)] border border-solid border-[var(--color-border)] rounded-lg p-3">
                  <div className="text-[13px] text-[#e4e4e4] font-mono whitespace-pre-wrap break-all">
                    {log.message}
                  </div>
                  {log.stack && log.stack !== '—' && (
                    <div className="text-[11px] text-[#ff7878] font-mono whitespace-pre-wrap border-t border-solid border-[var(--color-border)] mt-2 pt-2 max-h-[150px] overflow-y-auto">
                      {log.stack}
                    </div>
                  )}
                </div>

                <div className="flex gap-4 flex-wrap text-[11px] text-[var(--color-text-muted)] mt-2">
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
                    <span className={log.status >= 400 ? 'text-[#f85149]' : 'text-[var(--color-teal)]'}>
                      <strong>API Trigger:</strong> {log.method} {log.api} (Status: {log.status})
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-3">
              <button
                className="btn btn-ghost px-[14px] py-[6px] text-xs"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                &larr; Previous
              </button>
              <span className="text-xs text-[var(--color-text-muted)]">
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="btn btn-ghost px-[14px] py-[6px] text-xs"
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
