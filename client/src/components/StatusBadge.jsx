// ============================================================
//  client/src/components/StatusBadge.jsx  —  Status & Priority Chips
// ============================================================
//  USAGE:
//    <StatusBadge status="open" />
//    <PriorityBadge priority="high" />
// ============================================================

import { Circle, Clock, CheckCircle2, ArrowUp, Minus, ArrowDown, AlertTriangle } from 'lucide-react';

// [COMPONENT] Renders colored status chip for open | in-progress | closed
const StatusBadge = ({ status }) => {
  // [CONFIG] Map status → label, CSS class, icon
  const map = {
    'open':        { label: 'Open',        cls: 'badge-open',     Icon: Circle },
    'in-progress': { label: 'In Progress', cls: 'badge-progress', Icon: Clock },
    'closed':      { label: 'Closed',      cls: 'badge-closed',   Icon: CheckCircle2 },
    'declined':    { label: 'Declined',    cls: '',               Icon: AlertTriangle, style: { background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' } },
    'rejected':    { label: 'Declined',    cls: '',               Icon: AlertTriangle, style: { background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' } },
    'suspended':   { label: 'Under Review', cls: '',               Icon: Clock, style: { background: 'rgba(251, 146, 60, 0.08)', color: '#fb923c', border: '1px solid rgba(251, 146, 60, 0.2)' } },
  };

  const s = map[status] || { label: status, cls: '', Icon: Circle };

  return (
    <span className={`badge ${s.cls}`} style={s.style}>
      {/* [ICON] Status icon from lucide-react */}
      <s.Icon size={10} strokeWidth={2.5} />
      {s.label}
    </span>
  );
};

// [COMPONENT] Renders colored priority chip for high | medium | low
export const PriorityBadge = ({ priority }) => {
  // [CONFIG] Map priority → label, CSS class, icon
  const map = {
    urgent: { label: 'Urgent', cls: 'badge-urgent', Icon: AlertTriangle },
    high:   { label: 'High',   cls: 'badge-high',   Icon: ArrowUp },
    medium: { label: 'Medium', cls: 'badge-medium', Icon: Minus },
    low:    { label: 'Low',    cls: 'badge-low',    Icon: ArrowDown },
  };

  const p = map[priority] || { label: priority, cls: '', Icon: Minus };

  return (
    <span className={`badge ${p.cls}`}>
      {/* [ICON] Priority icon from lucide-react */}
      <p.Icon size={10} strokeWidth={2.5} />
      {p.label}
    </span>
  );
};

export default StatusBadge;
