import { useState, useEffect } from 'react';
import {
  Activity,
  User,
  Clock,
  CheckCircle,
  PlusCircle,
  UserCheck,
  Building,
  RefreshCw,
  Sliders,
  LogIn,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import API from '../services/authApi';
import { toast } from 'react-toastify';
import logger from '../utils/logger';
import { SkeletonCard, SkeletonChart, SkeletonText } from '../components/skeletons';

import { getCache, setCache } from '../utils/cache';

const Logs = () => {
  const [range, setRange] = useState('daily'); // 'daily', 'weekly', 'monthly'
  const [logs, setLogs] = useState(() => {
    const cached = getCache('activity_logs');
    return Array.isArray(cached) ? cached : [];
  });
  const [loading, setLoading] = useState(() => {
    const cached = getCache('activity_logs');
    return !Array.isArray(cached);
  });
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 12; // 12 logs per page (between 10 and 15)

  const fetchLogs = async (currentRange) => {
    logger.info('Logs', 'fetchLogs', `Fetching activity logs — range: ${currentRange}`, { api: `/api/logs?range=${currentRange}`, method: 'GET', action: 'Activity Logs Fetch Start' });
    try {
      const cached = getCache('activity_logs');
      if (!Array.isArray(cached) || cached.length === 0 || currentRange !== 'daily') {
        setLoading(true);
      }
      const { data } = await API.get(`/logs?range=${currentRange}`);
      setLogs(data);
      setCurrentPage(1);
      if (currentRange === 'daily') {
        setCache('activity_logs', data, 5);
      }
      logger.info('Logs', 'fetchLogs', `Activity logs loaded — ${data.length || 0} entries`, { api: `/api/logs?range=${currentRange}`, method: 'GET', status: 200, action: 'Activity Logs Fetch Success' });
    } catch (err) {
      logger.error('Logs', 'fetchLogs', 'Failed to fetch activity logs', err, { api: `/api/logs?range=${currentRange}`, method: 'GET', action: 'Activity Logs Fetch Failure' });
      toast.error('Failed to fetch activity logs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(range);
  }, [range]);

  // Color mappings
  const actionColors = {
    TICKET_CREATED: '#eac253',  // gold
    TICKET_ASSIGNED: '#3b82f6', // blue
    TICKET_CLOSED: '#22c55e',   // green
    AUTO_ALLOCATED: '#fb923c',  // orange
    STATUS_UPDATED: '#a855f7',  // purple
    ADMIN_CREATED: '#06b6d4',   // cyan
    AGENCY_CREATED: '#ec4899',  // pink
    AGENCY_UPDATED: '#14b8a6',  // teal
    USER_LOGIN: '#6e7681',      // gray
  };

  const actionIcons = {
    TICKET_CREATED: PlusCircle,
    TICKET_ASSIGNED: UserCheck,
    TICKET_CLOSED: CheckCircle,
    AUTO_ALLOCATED: Sliders,
    STATUS_UPDATED: Activity,
    ADMIN_CREATED: User,
    AGENCY_CREATED: Building,
    AGENCY_UPDATED: Building,
    USER_LOGIN: LogIn,
  };

  // Helper: Format action string
  const formatAction = (act) => {
    return act ? act.replace(/_/g, ' ') : '';
  };

  // Process data for Chart 1: Bar Chart (Activity per day)
  const getBarChartData = () => {
    const countsByDate = {};
    
    logs.forEach(log => {
      const dateStr = new Date(log.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
      
      if (!countsByDate[dateStr]) {
        countsByDate[dateStr] = { date: dateStr, created: 0, closed: 0, assigned: 0 };
      }
      
      if (log.action === 'TICKET_CREATED') {
        countsByDate[dateStr].created += 1;
      } else if (log.action === 'TICKET_CLOSED') {
        countsByDate[dateStr].closed += 1;
      } else if (log.action === 'TICKET_ASSIGNED' || log.action === 'AUTO_ALLOCATED') {
        countsByDate[dateStr].assigned += 1;
      }
    });

    return Object.values(countsByDate).reverse(); // chronological
  };

  // Process data for Chart 2: Line Chart (Cumulative tickets)
  const getLineChartData = () => {
    const dataByDate = {};
    
    // Sort logs chronologically to compute cumulative
    const sortedLogs = [...logs].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    let runningTotal = 0;
    
    sortedLogs.forEach(log => {
      if (log.action === 'TICKET_CREATED') {
        runningTotal += 1;
      }
      
      const dateStr = new Date(log.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
      
      dataByDate[dateStr] = { date: dateStr, cumulative: runningTotal };
    });

    return Object.values(dataByDate);
  };

  // Process data for Chart 3: Doughnut Chart (Status breakdown in logs)
  const getPieChartData = () => {
    let openCount = 0;
    let progressCount = 0;
    let closedCount = 0;

    logs.forEach(log => {
      if (log.action === 'TICKET_CREATED') {
        openCount++;
      } else if (log.action === 'TICKET_CLOSED') {
        closedCount++;
      } else if (log.action === 'STATUS_UPDATED') {
        if (log.note?.toLowerCase().includes('in-progress')) {
          progressCount++;
        } else if (log.note?.toLowerCase().includes('open')) {
          openCount++;
        }
      }
    });

    return [
      { name: 'Open / New', value: openCount, color: '#3fb950' },
      { name: 'In Progress', value: progressCount, color: '#d29922' },
      { name: 'Closed', value: closedCount, color: '#6e7681' },
    ].filter(x => x.value > 0);
  };

  const barData = getBarChartData();
  const lineData = getLineChartData();
  const pieData = getPieChartData();

  return (
    <div className="page-body fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Activity Logs</h1>
          <p className="page-subtitle">Monitor ticket states, admin tasks, and system events.</p>
        </div>
        <div className="flex gap-2 bg-[#161b22] p-1 rounded-lg">
          {['daily', 'weekly', 'monthly'].map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-[14px] py-[6px] rounded-md border-none text-white cursor-pointer text-xs font-semibold capitalize transition-all duration-300 ${range === r ? 'bg-gradient-to-r from-[#14a07d] to-[#0f766e] hover:from-[#0f766e] hover:to-[#14a07d] shadow-md' : 'bg-transparent'}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {loading && logs.length === 0 ? (
        <div className="fade-in">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5 mb-7">
            <SkeletonChart height="250px" />
            <SkeletonChart height="250px" />
            <SkeletonChart height="250px" />
          </div>
          <div className="flex flex-col gap-[10px]">
            <SkeletonCard height="64px" />
            <SkeletonCard height="64px" />
            <SkeletonCard height="64px" />
            <SkeletonCard height="64px" />
          </div>
        </div>
      ) : (
        <>
          {/* Charts Grid */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5 mb-7">
            
            {/* Chart 1 */}
            <div className="chart-card">
              <div className="chart-title">Daily Ticket Activity</div>
              <div className="chart-subtitle">Created vs Assigned vs Closed</div>
              <div className="h-[200px] mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" vertical={false} />
                    <XAxis dataKey="date" stroke="#888" fontSize={10} />
                    <YAxis stroke="#888" fontSize={10} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#111', border: '1px solid #2d2d2d', borderRadius: 8 }} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="created" name="Created" fill="#eac253" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="assigned" name="Assigned" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="closed" name="Closed" fill="#22c55e" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2 */}
            <div className="chart-card">
              <div className="chart-title">Cumulative Ticket Volume</div>
              <div className="chart-subtitle">Total raised tickets over time</div>
              <div className="h-[200px] mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" vertical={false} />
                    <XAxis dataKey="date" stroke="#888" fontSize={10} />
                    <YAxis stroke="#888" fontSize={10} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#111', border: '1px solid #2d2d2d', borderRadius: 8 }} />
                    <Line type="monotone" dataKey="cumulative" name="Total Tickets" stroke="var(--color-teal)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3 */}
            <div className="chart-card">
              <div className="chart-title">State Share</div>
              <div className="chart-subtitle">Status breakdown of logs</div>
              <div className="h-[200px] mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={4} dataKey="value" nameKey="name">
                      {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#111', border: '1px solid #2d2d2d', borderRadius: 8 }} />
                    <Legend verticalAlign="bottom" iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 9 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Timeline list */}
          <div className="flex justify-between items-center mb-[14px]">
            <h2 className="text-[15px] font-semibold">Activity Timeline</h2>
            <button
              onClick={() => fetchLogs(range)}
              className="bg-transparent border-none text-[var(--color-teal)] text-xs cursor-pointer flex items-center gap-1"
            >
              <RefreshCw size={12} /> Refresh
            </button>
          </div>

          <div className="flex flex-col gap-[10px]">
            {(() => {
              const indexOfLastLog = currentPage * logsPerPage;
              const indexOfFirstLog = indexOfLastLog - logsPerPage;
              const currentLogs = logs.slice(indexOfFirstLog, indexOfLastLog);
              const totalPages = Math.ceil(logs.length / logsPerPage) || 1;

              if (logs.length === 0) {
                return (
                  <div className="card text-center p-10 text-[var(--color-text-muted)]">
                    No events recorded in this time range.
                  </div>
                );
              }

              return (
                <>
                  {currentLogs.map((log) => {
                    const Icon = actionIcons[log.action] || Activity;
                    const color = actionColors[log.action] || 'var(--color-text-muted)';
                    return (
                      <div
                        key={log._id}
                        className="card px-[18px] py-[14px] flex items-center gap-4 bg-[var(--color-surface)] border border-solid border-[var(--color-border)]"
                      >
                        <div
                          className="w-[36px] h-[36px] rounded-full border border-solid flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: `rgba(${parseInt(color.slice(1,3),16)}, ${parseInt(color.slice(3,5),16)}, ${parseInt(color.slice(5,7),16)}, 0.08)`,
                            borderColor: color,
                            color: color
                          }}
                        >
                          <Icon size={16} />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <div className="flex justify-between flex-wrap gap-2">
                            <span
                              className="text-[10px] font-bold uppercase tracking-[0.05em]"
                              style={{ color: color }}
                            >
                              {formatAction(log.action)}
                            </span>
                            <span className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-1">
                              <Clock size={11} /> {new Date(log.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-[13px] text-[#e4e4e4] mt-1 break-words leading-snug">
                            {log.note}
                          </div>
                          {log.ticketId && (
                            <div className="text-[11px] text-[var(--color-teal)] mt-[2px]">
                              Ticket Link: <a href={`/tickets/${log.ticketId._id || log.ticketId}`} className="text-[var(--color-teal)] underline">#{String(log.ticketId._id || log.ticketId).slice(-6).toUpperCase()} - {log.ticketId.title}</a>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-3 mt-5">
                      <button
                        className="btn btn-ghost px-4 py-2 text-xs"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      >
                        &larr; Previous
                      </button>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        className="btn btn-ghost px-4 py-2 text-xs"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      >
                        Next &rarr;
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
};

export default Logs;
