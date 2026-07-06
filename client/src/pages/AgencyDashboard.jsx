import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Ticket,
  Clock,
  Percent,
  Sliders,
  X,
  ChevronRight,
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { getAgenciesDashboard, getTickets } from '../services/ticketApi';
import API from '../services/authApi';
import { toast } from 'react-toastify';
import StatusBadge, { PriorityBadge } from '../components/StatusBadge';
import logger from '../utils/logger';

const AgencyDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Details Modal State
  const [selectedAgency, setSelectedAgency] = useState(null);
  const [agencyTickets, setAgencyTickets] = useState([]);
  const [agencyLogs, setAgencyLogs] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchDashboardData = async () => {
    logger.info('AgencyDashboard', 'fetchDashboardData', 'Loading agency dashboard statistics', { api: '/api/agencies', method: 'GET', action: 'Agency Dashboard Load Start' });
    try {
      setLoading(true);
      const { data } = await getAgenciesDashboard();
      setData(data);
      logger.info('AgencyDashboard', 'fetchDashboardData', `Agency dashboard loaded — ${(data.agencies || []).length} agencies`, { api: '/api/agencies', method: 'GET', status: 200, action: 'Agency Dashboard Load Success' });
    } catch (err) {
      logger.error('AgencyDashboard', 'fetchDashboardData', 'Failed to load agency dashboard stats', err, { api: '/api/agencies', method: 'GET', action: 'Agency Dashboard Load Failure' });
      toast.error('Failed to load agency dashboard stats');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const openDetailsModal = async (agency) => {
    setSelectedAgency(agency);
    setModalLoading(true);
    try {
      // 1. Fetch tickets for this agency
      const tRes = await getTickets({ agencyId: agency.agencyId, limit: 100 });
      setAgencyTickets(tRes.data.tickets || []);
      
      // 2. Fetch logs for this agency (defaults to monthly logs)
      const lRes = await API.get(`/logs?range=monthly&agencyId=${agency.agencyId}`);
      setAgencyLogs(lRes.data || []);
    } catch (err) {
      toast.error('Failed to load agency details');
      console.error(err);
    } finally {
      setModalLoading(false);
    }
  };

  if (loading && !data) {
    return <div className="p-[60px] text-center"><div className="spinner" /></div>;
  }

  const { summary, agencies = [] } = data || {};

  return (
    <div className="page-body fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Agency Progress Dashboard</h1>
          <p className="page-subtitle">Overview of external agencies performance and allocation metrics.</p>
        </div>
      </div>

      {/* Summary Chips */}
      <div className="stat-grid mb-7">
        <div className="stat-card teal">
          <div className="flex justify-between items-start">
            <div>
              <div className="stat-label">Total Agencies</div>
              <div className="stat-value">{summary?.totalAgencies ?? 0}</div>
            </div>
            <Building2 size={24} className="opacity-50" />
          </div>
        </div>
        <div className="stat-card blue">
          <div className="flex justify-between items-start">
            <div>
              <div className="stat-label">Total Allocated Tickets</div>
              <div className="stat-value">{summary?.totalTickets ?? 0}</div>
            </div>
            <Ticket size={24} className="opacity-50" />
          </div>
        </div>
        <div className="stat-card green">
          <div className="flex justify-between items-start">
            <div>
              <div className="stat-label">Avg Completion %</div>
              <div className="stat-value">{summary?.avgCompletionRate ?? 0}%</div>
            </div>
            <Percent size={24} className="opacity-50" />
          </div>
        </div>
        <div className="stat-card orange">
          <div className="flex justify-between items-start">
            <div>
              <div className="stat-label">Auto-Allocated Tickets</div>
              <div className="stat-value">{summary?.autoAllocatedCount ?? 0}</div>
            </div>
            <Sliders size={24} className="opacity-50" />
          </div>
        </div>
      </div>

      {/* Agency Cards Grid */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(400px,1fr))] gap-5">
        {agencies.length === 0 ? (
          <div className="card col-[1/-1] text-center p-10 text-[var(--color-text-muted)]">
            No agencies setup in the system.
          </div>
        ) : (
          agencies.map((agency) => {
            // Segments helper
            const openVal = agency.open || 0;
            const progressVal = agency.inProgress || 0;
            const closedVal = agency.closed || 0;
            const underReviewVal = agency.underReview || 0;
            const declinedVal = agency.declined || 0;
            const totalVal = agency.total || 0;
            
            // Percentage calculations for segment bars
            const pctOpen = totalVal > 0 ? (openVal / totalVal) * 100 : 0;
            const pctProgress = totalVal > 0 ? (progressVal / totalVal) * 100 : 0;
            const pctClosed = totalVal > 0 ? (closedVal / totalVal) * 100 : 0;
            const pctReview = totalVal > 0 ? (underReviewVal / totalVal) * 100 : 0;
            const pctDeclined = totalVal > 0 ? (declinedVal / totalVal) * 100 : 0;

            return (
              <div key={agency.agencyId} className="card flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-semibold m-0 text-white">{agency.name}</h3>
                    <div className="flex gap-1 flex-wrap mt-1.5">
                      {agency.categories.map((c, i) => (
                        <span key={i} className="text-[9px] px-1.5 py-[1px] bg-[#252525] rounded text-[#acacac]">{c}</span>
                      ))}
                    </div>
                  </div>
                  
                  {/* Progress ring percentage */}
                  <div className="relative w-[50px] h-[50px] flex items-center justify-center">
                    <svg width="50" height="50" className="-rotate-90">
                      <circle cx="25" cy="25" r="20" fill="transparent" stroke="#252525" strokeWidth="4" />
                      <circle
                        cx="25"
                        cy="25"
                        r="20"
                        fill="transparent"
                        stroke="var(--color-teal)"
                        strokeWidth="4"
                        strokeDasharray={2 * Math.PI * 20}
                        strokeDashoffset={2 * Math.PI * 20 * (1 - agency.completionRate / 100)}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute text-[10px] font-bold text-white">{agency.completionRate}%</span>
                  </div>
                </div>

                {/* Segments mini-bar: open(green)/in-progress(yellow)/closed(gray)/under-review(orange)/declined(red) */}
                <div className="flex h-1.5 rounded-[3px] overflow-hidden bg-[#252525]">
                  {openVal > 0 && <div className={`bg-[#3fb950] w-[${pctOpen}%]`} title={`Open: ${openVal}`} />}
                  {progressVal > 0 && <div className={`bg-[#d29922] w-[${pctProgress}%]`} title={`In Progress: ${progressVal}`} />}
                  {closedVal > 0 && <div className={`bg-[#6e7681] w-[${pctClosed}%]`} title={`Closed: ${closedVal}`} />}
                  {underReviewVal > 0 && <div className={`bg-[#fb923c] w-[${pctReview}%]`} title={`Under Review: ${underReviewVal}`} />}
                  {declinedVal > 0 && <div className={`bg-[#f85149] w-[${pctDeclined}%]`} title={`Declined: ${declinedVal}`} />}
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-6 gap-1 py-2 border-y border-[#252525] text-center">
                  <div>
                    <div className="text-[9px] text-[var(--color-text-muted)] whitespace-nowrap">Total</div>
                    <div className="text-[13px] font-bold text-white mt-0.5">{agency.total}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-[#3fb950] whitespace-nowrap">Open</div>
                    <div className="text-[13px] font-bold text-[#3fb950] mt-0.5">{agency.open}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-[#d29922] whitespace-nowrap">Progress</div>
                    <div className="text-[13px] font-bold text-[#d29922] mt-0.5">{agency.inProgress}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-[#6e7681] whitespace-nowrap">Closed</div>
                    <div className="text-[13px] font-bold text-[#6e7681] mt-0.5">{agency.closed}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-[#fb923c] whitespace-nowrap">Review</div>
                    <div className="text-[13px] font-bold text-[#fb923c] mt-0.5">{agency.underReview || 0}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-[#f85149] whitespace-nowrap">Declined</div>
                    <div className="text-[13px] font-bold text-[#f85149] mt-0.5">{agency.declined || 0}</div>
                  </div>
                </div>

                <button className="btn btn-ghost w-full justify-center" onClick={() => navigate(`/agencies/${agency.agencyId || agency._id}/performance`)}>
                  View Performance Details <ChevronRight size={14} className="ml-1" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Agency Details Modal */}
      {selectedAgency && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-[800px] w-[90%] max-h-[90vh] flex flex-col">
            <div className="modal-header">
              <div>
                <h3 className="m-0">{selectedAgency.name}</h3>
                <p className="text-xs text-[var(--color-text-muted)] m-0 mt-1">{selectedAgency.email} • {selectedAgency.phone || 'No phone'}</p>
              </div>
              <button onClick={() => setSelectedAgency(null)} className="modal-close">
                <X size={18} />
              </button>
            </div>
            
            {modalLoading ? (
              <div className="p-10 text-center flex-1"><div className="spinner" /></div>
            ) : (
              <div className="overflow-y-auto pr-1.5 flex flex-col gap-5 flex-1 mt-3.5">
                {/* Description */}
                {selectedAgency.description && (
                  <div className="card p-3 bg-[rgba(255,255,255,0.02)]">
                    <div className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase mb-1">Description</div>
                    <div className="text-[13px] text-[#acacac] leading-relaxed">{selectedAgency.description}</div>
                  </div>
                )}

                {/* Dashboard statistics section */}
                <div className="grid grid-cols-[2fr_1fr] gap-4 min-h-[180px]">
                  {/* Status Breakdown Doughnut Chart */}
                  <div className="card flex flex-col">
                    <div className="text-[13px] font-semibold text-white mb-3">Status Distribution</div>
                    <div className="flex-1 h-[130px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Open', value: selectedAgency.open || 0, color: '#3fb950' },
                              { name: 'In Progress', value: selectedAgency.inProgress || 0, color: '#d29922' },
                              { name: 'Closed', value: selectedAgency.closed || 0, color: '#6e7681' },
                            ].filter(d => d.value > 0)}
                            cx="50%"
                            cy="50%"
                            innerRadius={25}
                            outerRadius={45}
                            paddingAngle={3}
                            dataKey="value"
                            nameKey="name"
                          >
                            {[
                              { name: 'Open', color: '#3fb950' },
                              { name: 'In Progress', color: '#d29922' },
                              { name: 'Closed', color: '#6e7681' }
                            ].map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                          </Pie>
                          <Tooltip contentStyle={{ background: '#111', border: '1px solid #2d2d2d', borderRadius: 8 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Summary counts */}
                  <div className="card flex flex-col justify-center gap-3">
                    <div>
                      <div className="text-[10px] text-[var(--color-text-muted)]">Completion Rate</div>
                      <div className="text-[22px] font-bold text-[var(--color-teal)]">{selectedAgency.completionRate}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--color-text-muted)]">Auto-Allocation Share</div>
                      <div className="text-lg font-bold text-white">
                        {agencyTickets.filter(t => t.autoAllocated).length} / {agencyTickets.length} tickets
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ticket History */}
                <div>
                  <h4 className="text-sm font-semibold text-white mb-2.5">Assigned Tickets History</h4>
                  <div className="table-wrap max-h-[220px] overflow-y-auto">
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Title</th>
                          <th>Status</th>
                          <th>Priority</th>
                          <th>Category</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agencyTickets.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="text-center text-[var(--color-text-muted)] p-3">No tickets allocated to this agency.</td>
                          </tr>
                        ) : (
                          agencyTickets.map(t => (
                            <tr key={t._id}>
                              <td className="font-mono text-[11px] text-[var(--color-text-muted)]">{t._id.slice(-6).toUpperCase()}</td>
                              <td className="max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap">
                                <a href={`/tickets/${t._id}`} className="text-[var(--color-teal)] underline">{t.title}</a>
                              </td>
                              <td><StatusBadge status={t.status} /></td>
                              <td><PriorityBadge priority={t.priority} /></td>
                              <td className="capitalize">{t.category}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Assignment Timeline (Logs) */}
                <div>
                  <h4 className="text-sm font-semibold text-white mb-2.5">Recent Activity Log (30 Days)</h4>
                  <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto pr-1">
                    {agencyLogs.length === 0 ? (
                      <div className="text-center p-4 text-[var(--color-text-muted)] border border-dashed border-[#252525] rounded-lg text-[13px]">No recent activity records.</div>
                    ) : (
                      agencyLogs.map(log => (
                        <div key={log._id} className="flex gap-2.5 bg-[#111] border border-[#252525] rounded-md py-2 px-3 text-xs">
                          <Clock size={13} className="text-[var(--color-text-muted)] mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <div className="flex justify-between text-[var(--color-text-muted)] text-[10px]">
                              <span>{log.action.replace(/_/g, ' ')}</span>
                              <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="text-[#acacac] mt-0.5">{log.note}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AgencyDashboard;
