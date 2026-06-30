import { useState, useEffect } from 'react';
import { getMyTeam, getTeamPerformance } from '../services/ticketApi';
import { toast } from 'react-toastify';
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
  const [team, setTeam] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadPerformanceData = async () => {
    logger.info('TeamPerformance', 'loadPerformanceData', 'Loading team performance data', { action: 'Team Performance Load Start' });
    try {
      setLoading(true);
      const teamRes = await getMyTeam();
      setTeam(teamRes.data);

      const perfRes = await getTeamPerformance(teamRes.data._id);
      setPerformance(perfRes.data);
      logger.info('TeamPerformance', 'loadPerformanceData', `Performance data loaded for team: ${teamRes.data.name}`, {
        api: `/api/teams/${teamRes.data._id}/performance`, method: 'GET', action: 'Team Performance Load Success',
      });
    } catch (err) {
      logger.error('TeamPerformance', 'loadPerformanceData', 'Failed to load team performance analytics', err, {
        api: '/api/teams/mine', method: 'GET', action: 'Team Performance Load Failure',
      });
      console.error(err);
      toast.error('Failed to load team performance analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPerformanceData();
  }, []);

  if (loading && !performance) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  const { stats, memberPerformance = [], weeklyData = [], monthlyClosedData = [] } = performance || {};

  // Find the top performer (member with highest closed count)
  const topPerformer = [...memberPerformance].sort((a, b) => b.closed - a.closed)[0];

  return (
    <div className="page-body fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Team Performance</h1>
          <p className="page-subtitle">Analyze ticket resolution rates, agent workloads, and performance trends for <strong>{team?.name}</strong>.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="stat-grid" style={{ marginBottom: 28 }}>
        <div className="stat-card teal" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Total Allocated</div>
              <div className="stat-value">{stats?.total || 0}</div>
            </div>
            <TrendingUp size={24} style={{ opacity: 0.5 }} />
          </div>
        </div>
        <div className="stat-card green" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Completed Tickets</div>
              <div className="stat-value">{stats?.closed || 0}</div>
            </div>
            <CheckCircle2 size={24} style={{ opacity: 0.5 }} />
          </div>
        </div>
        <div className="stat-card yellow" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">In Progress</div>
              <div className="stat-value">{stats?.inProgress || 0}</div>
            </div>
            <Clock size={24} style={{ opacity: 0.5 }} />
          </div>
        </div>
        <div className="stat-card blue" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Completion Rate</div>
              <div className="stat-value">{stats?.completionRate || 0}%</div>
            </div>
            <Percent size={24} style={{ opacity: 0.5 }} />
          </div>
        </div>
      </div>

      {/* Top Section: Top Agent & Weekly Trend */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, marginBottom: 28 }}>
        {/* Top Agent Spotlight */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 24, background: 'linear-gradient(135deg, #161b22, #0d1117)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Award size={28} style={{ color: 'var(--color-yellow)' }} />
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#fff' }}>Agent Spotlight</h3>
          </div>
          {topPerformer && topPerformer.closed > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--color-teal), var(--color-teal-dark))',
                color: '#fff', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 24, fontWeight: 700
              }}>
                {topPerformer.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 18, color: '#fff' }}>{topPerformer.name}</h4>
                <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-muted)', fontSize: 13 }}>
                  Has resolved <strong>{topPerformer.closed}</strong> tickets with a completion rate of <strong>{topPerformer.completionRate}%</strong>.
                </p>
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>No tickets resolved by any agents yet. Keep going!</div>
          )}
        </div>

        {/* Weekly Productivity Trend */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600, color: '#fff' }}>Weekly Productivity Trend</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: 120, padding: '10px 0 0 0' }}>
            {weeklyData.map((w, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1 }}>
                <div style={{ fontSize: 10, color: 'var(--color-teal)', fontWeight: 700 }}>{w.count}</div>
                <div style={{
                  width: 16,
                  height: Math.max(4, (w.count / (Math.max(...weeklyData.map(wd => wd.count)) || 1)) * 70),
                  background: 'linear-gradient(180deg, var(--color-teal), var(--color-teal-dark))',
                  borderRadius: '3px 3px 0 0',
                  transition: 'all 0.4s ease'
                }} />
                <div style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>{w.week}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Member Rankings & Workloads Table */}
      <div className="card" style={{ padding: 28 }}>
        <h3 style={{ margin: '0 0 18px 0', fontSize: 16, fontWeight: 600, color: '#fff' }}>Agent Workload & Performance Rankings</h3>
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
                  <td colSpan="7" style={{ textAlign: 'center', padding: 20, color: 'var(--color-text-muted)' }}>
                    No agents registered in this team.
                  </td>
                </tr>
              ) : (
                memberPerformance.map((member) => (
                  <tr key={member._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%',
                          background: '#333', color: '#fff', display: 'flex',
                          alignItems: 'center', justify: 'center', fontSize: 10, fontWeight: 700,
                          justifyContent: 'center'
                        }}>
                          {member.name?.[0]?.toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600, color: '#fff' }}>{member.name}</span>
                      </div>
                    </td>
                    <td>{member.total}</td>
                    <td>{member.open}</td>
                    <td>{member.inProgress}</td>
                    <td style={{ color: 'var(--color-success)', fontWeight: 600 }}>{member.closed}</td>
                    <td style={{ fontWeight: 700 }}>{member.completionRate}%</td>
                    <td style={{ width: 180 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: '#252525', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${member.completionRate}%`, height: '100%', background: 'var(--color-teal)' }} />
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
