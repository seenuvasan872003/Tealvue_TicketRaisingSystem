import { useState, useEffect } from 'react';
import { Activity, Server, FileText, ArrowRight, Play } from 'lucide-react';
import API from '../services/authApi';
import { toast } from 'react-toastify';
import logger from '../utils/logger';

const ApiFlowVisualizer = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const { data } = await API.get('/logs/client');
        // Filter logs that have api triggers recorded
        const apiLogs = (data || []).filter(l => l.api && l.api !== '—');
        setLogs(apiLogs);
        if (apiLogs.length > 0) {
          setSelectedLog(apiLogs[0]);
        }
      } catch (err) {
        toast.error('Failed to load API triggers logs');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="page-body fade-in">
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">API Execution Flow Visualizer</h1>
          <p className="page-subtitle">Track frontend events, file sources, and backend API triggers with execution paths.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" /></div>
      ) : logs.length === 0 ? (
        <div className="card empty-state" style={{ padding: '60px 40px', textAlign: 'center' }}>
          <Activity size={40} style={{ color: 'var(--color-text-muted)', marginBottom: 12, opacity: 0.5 }} />
          <h3>No API trigger events logged yet</h3>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>Trigger some actions on the dashboard or tickets page first.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
          {/* Left panel: Log Actions list */}
          <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '75vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.04em' }}>Trigger Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {logs.map(log => {
                const isActive = selectedLog?._id === log._id;
                return (
                  <div
                    key={log._id}
                    onClick={() => setSelectedLog(log)}
                    style={{
                      padding: 10,
                      borderRadius: 8,
                      border: `1px solid ${isActive ? 'var(--color-teal)' : 'var(--color-border)'}`,
                      background: isActive ? 'var(--color-teal-muted)' : 'rgba(255,255,255,0.01)',
                      cursor: 'pointer',
                      fontSize: 12,
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontWeight: 600 }}>
                      <span>{log.action || 'API Request'}</span>
                      <span style={{ color: log.status >= 400 ? 'var(--color-high)' : 'var(--color-open)' }}>{log.status}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {log.method} {log.api}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right panel: Flow Visualization */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {selectedLog && (
              <>
                {/* Visual execution flow chart */}
                <div className="card" style={{ padding: 24, background: 'var(--color-surface)', display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Execution Flow Chart</h3>
                  
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24, padding: '20px 0', position: 'relative' }}>
                    {/* Node 1: Client Page/Component */}
                    <div style={{ flex: 1, minWidth: 160, padding: 16, background: '#1c2128', border: '1px solid var(--color-border)', borderRadius: 10, textAlign: 'center' }}>
                      <FileText size={24} style={{ color: 'var(--color-teal)', marginBottom: 8 }} />
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Source Component</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginTop: 4 }}>{selectedLog.component || 'Global'}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{selectedLog.file || '—'}</div>
                    </div>

                    <ArrowRight size={20} style={{ color: 'var(--color-text-muted)' }} />

                    {/* Node 2: API Trigger */}
                    <div style={{ flex: 1, minWidth: 180, padding: 16, background: 'rgba(20,160,125,0.04)', border: '1px solid var(--color-teal)', borderRadius: 10, textAlign: 'center' }}>
                      <Play size={24} style={{ color: 'var(--color-teal)', marginBottom: 8 }} />
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>API Trigger Event</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-teal)', marginTop: 4 }}>{selectedLog.method} {selectedLog.api}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>User Action: {selectedLog.action || '—'}</div>
                    </div>

                    <ArrowRight size={20} style={{ color: 'var(--color-text-muted)' }} />

                    {/* Node 3: Server Endpoint */}
                    <div style={{ flex: 1, minWidth: 160, padding: 16, background: '#1c2128', border: '1px solid var(--color-border)', borderRadius: 10, textAlign: 'center' }}>
                      <Server size={24} style={{ color: selectedLog.status >= 400 ? 'var(--color-high)' : 'var(--color-open)', marginBottom: 8 }} />
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Backend Node</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginTop: 4 }}>REST Controller</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: selectedLog.status >= 400 ? 'var(--color-high)' : 'var(--color-open)', marginTop: 4 }}>
                        Status: {selectedLog.status}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details list card */}
                <div className="card" style={{ padding: 24 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 16 }}>Execution Details & Sample Payload</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', fontSize: 13, padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Request Method</span>
                      <span style={{ color: '#fff', fontWeight: 600 }}>{selectedLog.method}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', fontSize: 13, padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Target API Endpoint</span>
                      <span style={{ color: 'var(--color-teal)', fontFamily: 'monospace' }}>{selectedLog.api}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', fontSize: 13, padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Source Function</span>
                      <span style={{ color: '#fff' }}>{selectedLog.function || '—'}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', fontSize: 13, padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Response Status</span>
                      <span style={{ color: selectedLog.status >= 400 ? 'var(--color-high)' : 'var(--color-open)', fontWeight: 750 }}>
                        {selectedLog.status}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', fontSize: 13, padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>User Entity</span>
                      <span style={{ color: '#fff' }}>
                        {(() => {
                          if (selectedLog.userId && typeof selectedLog.userId === 'object') {
                            return `${selectedLog.userId.name || selectedLog.userId.email || 'Anonymous'} (${selectedLog.userId.role || 'user'})`;
                          }
                          return selectedLog.user || 'Anonymous';
                        })()}
                        {' '}(ID: {typeof selectedLog.userId === 'object' ? selectedLog.userId._id : selectedLog.userId || '—'})
                      </span>
                    </div>
                    
                    {/* Simulated Sample Data Payload */}
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 8 }}>Simulated Payload Response Sample</div>
                      <pre style={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 8,
                        padding: 14,
                        color: 'var(--color-teal)',
                        fontSize: 12,
                        fontFamily: 'monospace',
                        overflowX: 'auto'
                      }}>
                        {JSON.stringify({
                          apiPath: selectedLog.api,
                          triggerAction: selectedLog.action,
                          component: selectedLog.component,
                          method: selectedLog.method,
                          status: selectedLog.status,
                          timestamp: selectedLog.timestamp,
                          payloadSample: {
                            success: selectedLog.status < 400,
                            message: selectedLog.message,
                            durationMs: Math.floor(Math.random() * 150) + 10,
                          }
                        }, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiFlowVisualizer;
