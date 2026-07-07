import { useState, useEffect } from 'react';
import { getMyTeam, getTeamPerformance, getTeams } from '../services/ticketApi';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import ExportButton from '../components/ExportButton';
import {
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Clock,
  Award,
  Users,
  Percent,
} from 'lucide-react';
import logger from '../utils/logger';
import { SkeletonCard, SkeletonTable, SkeletonText } from '../components/skeletons';

import { getCache, setCache } from '../utils/cache';

const TeamPerformance = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState(() => {
    const cached = getCache('teams_list');
    return Array.isArray(cached) ? cached : [];
  });
  const [team, setTeam] = useState(() => getCache('my_team'));
  const [performance, setPerformance] = useState(() => getCache('team_performance'));
  const [loading, setLoading] = useState(() => !getCache('team_performance'));
  
  const [activeTab, setActiveTab] = useState('overview');
  const [feedbacks, setFeedbacks] = useState([]);
  const [teamData, setTeamData] = useState(null);

  const loadPerformanceData = async (selectedTeamId = null) => {
    logger.info('TeamPerformance', 'loadPerformanceData', 'Loading team performance data', { action: 'Team Performance Load Start' });
    try {
      const cached = getCache('team_performance');
      if (!cached) {
        setLoading(true);
      }
      let activeTeamId = selectedTeamId;
      let activeTeam = team;

      if (user?.role === 'super-admin') {
        const teamsRes = await getTeams();
        const allTeams = teamsRes.data || [];
        setTeams(allTeams);
        setCache('teams_list', allTeams, 15);

        if (allTeams.length > 0) {
          if (!activeTeamId) {
            activeTeam = allTeams[0];
            activeTeamId = allTeams[0]._id;
          } else {
            activeTeam = allTeams.find(t => t._id === activeTeamId) || allTeams[0];
          }
          setTeam(activeTeam);
        } else {
          setTeam(null);
          setPerformance(null);
          return;
        }
      } else {
        const teamRes = await getMyTeam();
        activeTeam = teamRes.data;
        activeTeamId = teamRes.data._id;
        setTeam(activeTeam);
        setCache('my_team', activeTeam, 15);
      }

      if (activeTeamId) {
        const perfRes = await getTeamPerformance(activeTeamId);
        setPerformance(perfRes.data);
        setCache('team_performance', perfRes.data, 10);
        logger.info('TeamPerformance', 'loadPerformanceData', `Performance data loaded for team: ${activeTeam.name}`, {
          api: `/api/teams/${activeTeamId}/performance`, method: 'GET', action: 'Team Performance Load Success',
        });

        // Load feedback comments
        try {
          const rolePrefix = user?.role === 'super-admin' ? 'super-admin' : user?.role === 'admin' ? 'admin' : 'team-admin';
          const fbRes = await API.get(`/${rolePrefix}/feedback/team/${activeTeamId}`);
          setFeedbacks(fbRes.data.feedbacks || []);
          if (fbRes.data.team) {
            setTeamData(fbRes.data.team);
          }
        } catch (err) {
          console.error('Failed to load feedback comments:', err);
        }
      }
    } catch (err) {
      logger.error('TeamPerformance', 'loadPerformanceData', 'Failed to load team performance analytics', err, {
        action: 'Team Performance Load Failure',
      });
      console.error(err);
      toast.error('Failed to load team performance analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPerformanceData();
  }, [user]);

  if (loading && !performance) {
    return (
      <div className="page-body fade-in">
        <div className="page-header flex justify-between items-center mb-6">
          <div className="flex flex-col gap-2 w-1/3">
            <SkeletonText height="24px" width="60%" />
            <SkeletonText height="14px" width="100%" />
          </div>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4 mb-6">
          <SkeletonCard height="110px" />
          <SkeletonCard height="110px" />
          <SkeletonCard height="110px" />
          <SkeletonCard height="110px" />
        </div>
        <SkeletonTable rows={4} columns={5} />
      </div>
    );
  }

  if (!loading && !team) {
    return (
      <div className="page-body fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Team Performance</h1>
            <p className="page-subtitle">No teams found in the system.</p>
          </div>
        </div>
        <div className="card empty-state p-10 text-center">
          <h3>No teams created yet</h3>
          <p>Please create a team first to view performance analytics.</p>
        </div>
      </div>
    );
  }

  const { stats, memberPerformance = [], weeklyData = [], monthlyClosedData = [] } = performance || {};

  // Find the top performer (member with highest closed count)
  const topPerformer = [...memberPerformance].sort((a, b) => b.closed - a.closed)[0];

  return (
    <div className="page-body fade-in">
      <div className="page-header flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="page-title">Team Performance</h1>
          <p className="page-subtitle">Analyze ticket resolution rates, agent workloads, and performance trends for <strong>{team?.name}</strong>.</p>
        </div>
        {user?.role === 'super-admin' && teams.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-[var(--color-text-muted)] font-medium">Select Team:</span>
            <select
              value={team?._id || ''}
              onChange={(e) => loadPerformanceData(e.target.value)}
              className="select w-[200px] py-1.5 px-3 text-[13px] h-[36px]"
            >
              {teams.map(t => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Tab Navigation */}
      <div className="flex gap-1 border-b border-[var(--color-border)] mb-5">
        {['overview', 'feedback'].map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2.5 bg-transparent border-none font-semibold cursor-pointer text-sm capitalize ${
              activeTab === t
                ? 'border-b-2 border-[var(--color-teal)] text-[var(--color-teal)]'
                : 'border-b-2 border-transparent text-[#acacac]'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Summary Cards */}
      <div className="stat-grid mb-7">
        <div className="stat-card teal p-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="stat-label">Total Allocated</div>
              <div className="stat-value">{stats?.total || 0}</div>
            </div>
            <TrendingUp size={24} className="opacity-50" />
          </div>
        </div>
        <div className="stat-card green p-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="stat-label">Completed Tickets</div>
              <div className="stat-value">{stats?.closed || 0}</div>
            </div>
            <CheckCircle2 size={24} className="opacity-50" />
          </div>
        </div>
        <div className="stat-card yellow p-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="stat-label">In Progress</div>
              <div className="stat-value">{stats?.inProgress || 0}</div>
            </div>
            <Clock size={24} className="opacity-50" />
          </div>
        </div>
        <div className="stat-card blue p-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="stat-label">Completion Rate</div>
              <div className="stat-value">{stats?.completionRate || 0}%</div>
            </div>
            <Percent size={24} className="opacity-50" />
          </div>
        </div>
      </div>

      {/* Top Section: Top Agent & Weekly Trend */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-7 mb-7">
        {/* Top Agent Spotlight */}
        <div className="card flex flex-col justify-center p-6 bg-gradient-to-br from-[#161b22] to-[#0d1117]">
          <div className="flex items-center gap-3 mb-4">
            <Award size={28} className="text-[var(--color-yellow)]" />
            <h3 className="m-0 text-lg font-bold text-white">Agent Spotlight</h3>
          </div>
          {topPerformer && topPerformer.closed > 0 ? (
            <div className="flex items-center gap-4">
              <div className="w-[60px] h-[60px] rounded-full bg-gradient-to-br from-[var(--color-teal)] to-[var(--color-teal-dark)] text-white flex items-center justify-center text-2xl font-bold">
                {topPerformer.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <h4 className="m-0 text-lg text-white">{topPerformer.name}</h4>
                <p className="m-0 mt-1 text-[var(--color-text-muted)] text-[13px]">
                  Has resolved <strong>{topPerformer.closed}</strong> tickets with a completion rate of <strong>{topPerformer.completionRate}%</strong>.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-[var(--color-text-muted)] text-sm">No tickets resolved by any agents yet. Keep going!</div>
          )}
        </div>

        {/* Weekly Productivity Trend */}
        <div className="card p-6">
          <h3 className="m-0 mb-4 text-base font-semibold text-white">Weekly Productivity Trend</h3>
          <div className="flex justify-between items-end h-[120px] pt-2.5">
            {weeklyData.map((w, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2 flex-1">
                <div className="text-[10px] text-[var(--color-teal)] font-bold">{w.count}</div>
                <div 
                  className="w-4 bg-gradient-to-b from-[var(--color-teal)] to-[var(--color-teal-dark)] rounded-t-[3px] transition-all duration-500 ease-in-out" 
                  style={{ height: Math.max(4, (w.count / (Math.max(...weeklyData.map(wd => wd.count)) || 1)) * 70) }} 
                />
                <div className="text-[9px] text-[var(--color-text-muted)]">{w.week}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Member Rankings & Workloads Table */}
      <div className="card p-7">
        <h3 className="m-0 mb-4 text-base font-semibold text-white">Agent Workload & Performance Rankings</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Total Assigned</th>
                <th>Open</th>
                <th>In Progress</th>
                <th>Closed</th>
                <th>Resolution Rate</th>
                <th>Performance Bar</th>
              </tr>
            </thead>
            <tbody>
              {memberPerformance.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center p-5 text-[var(--color-text-muted)]">
                    No agents registered in this team.
                  </td>
                </tr>
              ) : (
                memberPerformance.map((member) => (
                  <tr key={member._id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#333] text-white flex items-center justify-center text-[10px] font-bold">
                          {member.name?.[0]?.toUpperCase()}
                        </div>
                        <span className="font-semibold text-white">{member.name}</span>
                      </div>
                    </td>
                    <td>{member.total}</td>
                    <td>{member.open}</td>
                    <td>{member.inProgress}</td>
                    <td className="text-[var(--color-success)] font-semibold">{member.closed}</td>
                    <td className="font-bold">{member.completionRate}%</td>
                    <td className="w-[180px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-[#252525] rounded-[3px] overflow-hidden">
                          <div className="h-full bg-[var(--color-teal)]" style={{ width: `${member.completionRate}%` }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {activeTab === 'feedback' && (
        <div className="space-y-6">
          {/* Average Rating */}
          {(() => {
            const resolvedTeam = teamData || team;
            return (
              <>
                <div className="card p-6">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-5xl font-bold text-yellow-400">{resolvedTeam?.averageRating?.toFixed(1) || '—'}</p>
                      <div className="flex justify-center gap-0.5 mt-1">
                        {[1,2,3,4,5].map(s => (
                          <span key={s} style={{ color: s <= Math.round(resolvedTeam?.averageRating || 0) ? '#eac253' : '#3a3a3a' }}>★</span>
                        ))}
                      </div>
                      <p className="text-xs text-white/40 mt-1">Average Rating</p>
                    </div>
                    <div className="ml-8">
                      <p className="text-2xl font-bold text-white">{resolvedTeam?.totalFeedbacks || 0}</p>
                      <p className="text-xs text-white/40">Total Feedbacks</p>
                    </div>
                  </div>

                  {/* Star Breakdown */}
                  <div className="mt-6 space-y-2">
                    {['five','four','three','two','one'].map((key, i) => {
                      const stars = 5 - i;
                      const count = resolvedTeam?.ratingBreakdown?.[key] || 0;
                      const total = resolvedTeam?.totalFeedbacks || 1;
                      const pct   = Math.round((count / total) * 100);
                      return (
                        <div key={key} className="flex items-center gap-3">
                          <span className="text-xs text-white/50 w-8 text-right">{stars}★</span>
                          <div className="flex-1 bg-[#252525] rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-yellow-400 transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-white/50 w-10">{pct}%</span>
                          <span className="text-xs text-white/30 w-8">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            );
          })()}

          {/* Recent Comments */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-white/70">Recent Feedback Comments</h4>
              {team && (
                <ExportButton
                  endpoint={`/api/team-admin/export/feedback`}
                  filename="feedback"
                  filters={{ teamId: team._id }}
                  label="Export Feedback"
                />
              )}
            </div>
             {feedbacks.length === 0 ? (
              <p className="text-sm text-white/30 text-center py-8">No feedback yet</p>
            ) : feedbacks.map(fb => (
              <div key={fb._id} className="border-b border-white/5 py-4 flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="text-sm font-semibold text-white/90">{fb.userId?.name || 'Anonymous'}</div>
                  <div className="text-xs text-white/60 leading-relaxed">{fb.comment || <em className="text-white/20">No comment</em>}</div>
                  {fb.teamUserId && (
                    <div className="text-[11px] text-teal-400 font-semibold mt-1">Solved by: {fb.teamUserId.name}</div>
                  )}
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                  <span className="text-xs font-bold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">{fb.rating}★</span>
                  <span className="text-[10px] text-white/30">{new Date(fb.submittedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamPerformance;
