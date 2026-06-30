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

const Logs = () => {
  const [range, setRange] = useState('daily'); // 'daily', 'weekly', 'monthly'
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 12; // 12 logs per page (between 10 and 15)

  const fetchLogs = async (currentRange) => {
    logger.info('Logs', 'fetchLogs', `Fetching activity logs — range: ${currentRange}`, { api: `/api/logs?range=${currentRange}`, method: 'GET', action: 'Activity Logs Fetch Start' });
    try {
      setLoading(true);
      const { data } = await API.get(`/logs?range=${currentRange}`);
      setLogs(data);
      setCurrentPage(1);
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
        <div style={{ display: 'flex', gap: 8, background: '#161b22', padding: 4, borderRadius: 8 }}>
          {['daily', 'weekly', 'monthly'].map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                background: range === r ? 'var(--color-teal)' : 'transparent',
                color: '#fff',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                textTransform: 'capitalize',
                transition: 'all 0.2s'
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {loading && logs.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" /></div>
      ) : (
        <>
          {/* Charts Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 28 }}>
            
            {/* Chart 1 */}
            <div className="chart-card">
              <div className="chart-title">Daily Ticket Activity</div>
              <div className="chart-subtitle">Created vs Assigned vs Closed</div>
              <div style={{ height: 200, marginTop: 12 }}>
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
              <div style={{ height: 200, marginTop: 12 }}>
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
              <div style={{ height: 200, marginTop: 12 }}>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600 }}>Activity Timeline</h2>
            <button
              onClick={() => fetchLogs(range)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-teal)',
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <RefreshCw size={12} /> Refresh
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(() => {
              const indexOfLastLog = currentPage * logsPerPage;
              const indexOfFirstLog = indexOfLastLog - logsPerPage;
              const currentLogs = logs.slice(indexOfFirstLog, indexOfLastLog);
              const totalPages = Math.ceil(logs.length / logsPerPage) || 1;

              if (logs.length === 0) {
                return (
                  <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
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
                        className="card"
                        style={{
                          padding: '14px 18px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 16,
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: `rgba(${parseInt(color.slice(1,3),16)}, ${parseInt(color.slice(3,5),16)}, ${parseInt(color.slice(5,7),16)}, 0.08)`,
                            border: `1px solid ${color}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: color,
                            flexShrink: 0
                          }}
                        >
                          <Icon size={16} />
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                color: color,
                              }}
                            >
                              {formatAction(log.action)}
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Clock size={11} /> {new Date(log.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <div style={{ fontSize: 13, color: '#e4e4e4', marginTop: 4, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {log.note}
                          </div>
                          {log.ticketId && (
                            <div style={{ fontSize: 11, color: 'var(--color-teal)', marginTop: 2 }}>
                              Ticket Link: <a href={`/tickets/${log.ticketId._id || log.ticketId}`} style={{ color: 'var(--color-teal)', textDecoration: 'underline' }}>#{String(log.ticketId._id || log.ticketId).slice(-6).toUpperCase()} - {log.ticketId.title}</a>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 20 }}>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '8px 16px', fontSize: 12 }}
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
                        style={{ padding: '8px 16px', fontSize: 12 }}
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
