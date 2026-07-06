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
      <div className="page-header mb-6">
        <div>
          <h1 className="page-title">API Execution Flow Visualizer</h1>
          <p className="page-subtitle">Track frontend events, file sources, and backend API triggers with execution paths.</p>
        </div>
      </div>

      {loading ? (
        <div className="p-[60px] text-center"><div className="spinner" /></div>
      ) : logs.length === 0 ? (
        <div className="card empty-state px-10 py-[60px] text-center">
          <Activity size={40} className="text-[var(--color-text-muted)] mb-3 opacity-50 mx-auto" />
          <h3>No API trigger events logged yet</h3>
          <p className="text-[13px] text-[var(--color-text-muted)] m-0">Trigger some actions on the dashboard or tickets page first.</p>
        </div>
      ) : (
        <div className="grid grid-cols-[320px_1fr] gap-5">
          {/* Left panel: Log Actions list */}
          <div className="card p-4 flex flex-col gap-3 max-h-[75vh] overflow-y-auto">
            <h3 className="text-[13px] font-bold uppercase text-[var(--color-text-muted)] tracking-[0.04em]">Trigger Actions</h3>
            <div className="flex flex-col gap-2">
              {logs.map(log => {
                const isActive = selectedLog?._id === log._id;
                return (
                  <div
                    key={log._id}
                    onClick={() => setSelectedLog(log)}
                    className={`p-[10px] rounded-lg border border-solid cursor-pointer text-xs transition-all duration-150 ${isActive ? 'border-[var(--color-teal)] bg-[var(--color-teal-muted)]' : 'border-[var(--color-border)] bg-[rgba(255,255,255,0.01)]'}`}
                  >
                    <div className="flex justify-between text-white font-semibold">
                      <span>{log.action || 'API Request'}</span>
                      <span className={log.status >= 400 ? 'text-[var(--color-high)]' : 'text-[var(--color-open)]'}>{log.status}</span>
                    </div>
                    <div className="text-[11px] text-[var(--color-text-muted)] mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
                      {log.method} {log.api}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right panel: Flow Visualization */}
          <div className="flex flex-col gap-5">
            {selectedLog && (
              <>
                {/* Visual execution flow chart */}
                <div className="card p-6 bg-[var(--color-surface)] flex flex-col gap-5">
                  <h3 className="text-[14px] font-semibold text-white">Execution Flow Chart</h3>
                  
                  <div className="flex items-center justify-between flex-wrap gap-6 py-5 relative">
                    {/* Node 1: Client Page/Component */}
                    <div className="flex-1 min-w-[160px] p-4 bg-[#1c2128] border border-solid border-[var(--color-border)] rounded-[10px] text-center">
                      <FileText size={24} className="text-[var(--color-teal)] mb-2" />
                      <div className="text-[11px] text-[var(--color-text-muted)] uppercase font-bold">Source Component</div>
                      <div className="text-[13px] font-semibold text-white mt-1">{selectedLog.component || 'Global'}</div>
                      <div className="text-[11px] text-[var(--color-text-muted)] mt-[2px]">{selectedLog.file || '—'}</div>
                    </div>

                    <ArrowRight size={20} className="text-[var(--color-text-muted)]" />

                    {/* Node 2: API Trigger */}
                    <div className="flex-1 min-w-[180px] p-4 bg-[rgba(20,160,125,0.04)] border border-solid border-[var(--color-teal)] rounded-[10px] text-center">
                      <Play size={24} className="text-[var(--color-teal)] mb-2" />
                      <div className="text-[11px] text-[var(--color-text-muted)] uppercase font-bold">API Trigger Event</div>
                      <div className="text-[13px] font-bold text-[var(--color-teal)] mt-1">{selectedLog.method} {selectedLog.api}</div>
                      <div className="text-[11px] text-[var(--color-text-muted)] mt-[2px]">User Action: {selectedLog.action || '—'}</div>
                    </div>

                    <ArrowRight size={20} className="text-[var(--color-text-muted)]" />

                    {/* Node 3: Server Endpoint */}
                    <div className="flex-1 min-w-[160px] p-4 bg-[#1c2128] border border-solid border-[var(--color-border)] rounded-[10px] text-center">
                      <Server size={24} className={`mb-2 ${selectedLog.status >= 400 ? 'text-[var(--color-high)]' : 'text-[var(--color-open)]'}`} />
                      <div className="text-[11px] text-[var(--color-text-muted)] uppercase font-bold">Backend Node</div>
                      <div className="text-[13px] font-semibold text-white mt-1">REST Controller</div>
                      <div className={`text-xs font-bold mt-1 ${selectedLog.status >= 400 ? 'text-[var(--color-high)]' : 'text-[var(--color-open)]'}`}>
                        Status: {selectedLog.status}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details list card */}
                <div className="card p-6">
                  <h3 className="text-[14px] font-semibold text-white mb-4">Execution Details & Sample Payload</h3>
                  
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-[150px_1fr] text-[13px] py-2 border-b border-solid border-[var(--color-border)]">
                      <span className="text-[var(--color-text-muted)]">Request Method</span>
                      <span className="text-white font-semibold">{selectedLog.method}</span>
                    </div>
                    <div className="grid grid-cols-[150px_1fr] text-[13px] py-2 border-b border-solid border-[var(--color-border)]">
                      <span className="text-[var(--color-text-muted)]">Target API Endpoint</span>
                      <span className="text-[var(--color-teal)] font-mono">{selectedLog.api}</span>
                    </div>
                    <div className="grid grid-cols-[150px_1fr] text-[13px] py-2 border-b border-solid border-[var(--color-border)]">
                      <span className="text-[var(--color-text-muted)]">Source Function</span>
                      <span className="text-white">{selectedLog.function || '—'}</span>
                    </div>
                    <div className="grid grid-cols-[150px_1fr] text-[13px] py-2 border-b border-solid border-[var(--color-border)]">
                      <span className="text-[var(--color-text-muted)]">Response Status</span>
                      <span className={`font-bold ${selectedLog.status >= 400 ? 'text-[var(--color-high)]' : 'text-[var(--color-open)]'}`}>
                        {selectedLog.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-[150px_1fr] text-[13px] py-2 border-b border-solid border-[var(--color-border)]">
                      <span className="text-[var(--color-text-muted)]">User Entity</span>
                      <span className="text-white">
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
                    <div className="mt-3">
                      <div className="text-[11px] font-bold uppercase text-[var(--color-text-muted)] mb-2">Simulated Payload Response Sample</div>
                      <pre className="bg-[var(--color-surface)] border border-solid border-[var(--color-border)] rounded-lg p-[14px] text-[var(--color-teal)] text-xs font-mono overflow-x-auto">
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
