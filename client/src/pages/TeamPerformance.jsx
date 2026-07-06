import { useState, useEffect } from 'react';
import { getMyTeam, getTeamPerformance, getTeams } from '../services/ticketApi';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
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

const TeamPerformance = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [team, setTeam] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadPerformanceData = async (selectedTeamId = null) => {
    logger.info('TeamPerformance', 'loadPerformanceData', 'Loading team performance data', { action: 'Team Performance Load Start' });
    try {
      setLoading(true);
      let activeTeamId = selectedTeamId;
      let activeTeam = team;

      if (user?.role === 'super-admin') {
        const teamsRes = await getTeams();
        const allTeams = teamsRes.data || [];
        setTeams(allTeams);

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
      }

      if (activeTeamId) {
        const perfRes = await getTeamPerformance(activeTeamId);
        setPerformance(perfRes.data);
        logger.info('TeamPerformance', 'loadPerformanceData', `Performance data loaded for team: ${activeTeam.name}`, {
          api: `/api/teams/${activeTeamId}/performance`, method: 'GET', action: 'Team Performance Load Success',
        });
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
      <div className="p-[60px] text-center">
        <div className="spinner" />
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
    </div>
  );
};

export default TeamPerformance;
