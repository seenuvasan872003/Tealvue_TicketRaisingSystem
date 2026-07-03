// ============================================================
//  client/src/components/FeatureChecklist.jsx
// ============================================================
//  Shows ALL 20 features for any user regardless of role.
//  Checked = feature is active for this user.
//  Unchecked = feature is disabled (won't show in sidebar).
//  Tracks dirty state, shows add/remove diff badges.
// ============================================================

import { useState, useMemo, useCallback } from 'react';
import { toast } from 'react-toastify';
import { Check, X, RotateCcw, Save, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { FEATURES }       from '../config/featureList';
import { ROLE_DEFAULTS }  from '../config/roleDefaults';
import API from '../services/authApi';
import { useAuth } from '../context/AuthContext';
import { getFeatureApiPath } from '../config/featureHelpers';

// Group ALL features by category
const ALL_GROUPED = (() => {
  const map = {};
  FEATURES.forEach(f => {
    if (!map[f.category]) map[f.category] = [];
    map[f.category].push(f);
  });
  return map;
})();

const TOTAL_FEATURES = FEATURES.length;

const FeatureChecklist = ({ userId, role, features: savedFeatures, onSaved, onClose, isSelf }) => {
  const { user: currentUser } = useAuth();
  const [local,  setLocal]  = useState([...(savedFeatures || [])]);
  const [saving, setSaving] = useState(false);

  // ── Dirty tracking ─────────────────────────────────────────
  const isDirty = useMemo(() => {
    const saved = new Set(savedFeatures || []);
    const curr  = new Set(local);
    if (saved.size !== curr.size) return true;
    for (const f of saved) { if (!curr.has(f)) return true; }
    return false;
  }, [local, savedFeatures]);

  // ── Diff badges ────────────────────────────────────────────
  const added   = useMemo(() => local.filter(f => !(savedFeatures || []).includes(f)), [local, savedFeatures]);
  const textFeatures = savedFeatures || [];
  const removed = useMemo(() => textFeatures.filter(f => !local.includes(f)), [local, textFeatures]);

  // Get default features for this user's role that are locked/immutable
  const defaultFeatures = useMemo(() => {
    return ROLE_DEFAULTS[role] || ['dashboard'];
  }, [role]);

  // ── Toggle ─────────────────────────────────────────────────
  const toggle = useCallback((featureId) => {
    if (defaultFeatures.includes(featureId)) {
      toast.warning('This is a default feature for this role and cannot be modified.');
      return;
    }
    if (isSelf && featureId === 'roles_features') {
      toast.warning('You cannot remove Roles & Features access from your own account.');
      return;
    }
    setLocal(prev =>
      prev.includes(featureId) ? prev.filter(f => f !== featureId) : [...prev, featureId]
    );
  }, [isSelf, defaultFeatures]);

  // ── Select All / Deselect All ──────────────────────────────
  const selectAll = () => {
    const allIds = FEATURES.map(f => f.id);
    setLocal(allIds);
  };
  const deselectAll = () => {
    // Keep only the default features for this role (which are locked)
    // plus roles_features if isSelf
    const keep = [...defaultFeatures];
    if (isSelf && !keep.includes('roles_features')) {
      keep.push('roles_features');
    }
    setLocal(keep);
  };

  const resetToDefault = useCallback(() => {
    setLocal([...defaultFeatures]);
  }, [defaultFeatures]);

  // ── Save ───────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const apiPath = getFeatureApiPath('roles_features', currentUser?.role);
      const relativePath = apiPath.startsWith('/api') ? apiPath.substring(4) : apiPath;
      const res = await API.put(`${relativePath}/${userId}`, { features: local });
      toast.success('Features updated successfully!');
      onSaved && onSaved(res.data.features);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save features');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setLocal([...(savedFeatures || [])]);
  };

  const enabledCount = local.length;

  return (
    <div className="bg-[rgba(10,15,25,0.6)] border border-[var(--color-border)] rounded-[14px] px-4 sm:px-[22px] py-4 sm:py-5 mt-2.5">

      {/* ── Header Bar ── */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2.5">
        <div className="flex items-center gap-3">
          {/* Total progress pill */}
          <div className="bg-[rgba(20,184,166,0.12)] border border-[rgba(20,184,166,0.25)] rounded-[20px] px-[14px] py-1 flex items-center gap-1.5">
            <span className="text-[18px] font-extrabold text-[var(--color-teal)] leading-none">
              {enabledCount}
            </span>
            <span className="text-[11px] text-[var(--color-text-muted)] font-medium">
              / {TOTAL_FEATURES} features enabled
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-[100px] h-1.5 bg-[var(--color-border)] rounded-[10px] overflow-hidden">
            <div className="h-full rounded-[10px] bg-gradient-to-r from-[var(--color-teal-dark)] to-[var(--color-teal)] transition-all duration-300 ease-in-out" style={{ width: `${(enabledCount / TOTAL_FEATURES) * 100}%` }} />
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex gap-1.5">
          <button
            onClick={selectAll}
            className="bg-[rgba(20,184,166,0.1)] border border-[rgba(20,184,166,0.25)] rounded-lg px-3 py-1 text-[11px] font-semibold text-[var(--color-teal)] cursor-pointer flex items-center gap-1 transition-all duration-150 hover:bg-[rgba(20,184,166,0.15)]"
          >
            <CheckCircle size={12} /> Enable All
          </button>
          <button
            onClick={deselectAll}
            className="bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] rounded-lg px-3 py-1 text-[11px] font-semibold text-[#ef4444] cursor-pointer flex items-center gap-1 transition-all duration-150 hover:bg-[rgba(239,68,68,0.12)]"
          >
            <XCircle size={12} /> Disable All
          </button>
        </div>
      </div>

      {/* ── Diff Change Badges ── */}
      {isDirty && (added.length > 0 || removed.length > 0) && (
        <div className="flex flex-wrap gap-1.5 mb-3.5 px-3 py-2.5 bg-white/5 rounded-lg border border-dashed border-[var(--color-border)]">
          <span className="text-[11px] text-[var(--color-text-muted)] font-semibold mr-1 self-center">
            Pending:
          </span>
          {added.map(f => {
            const feat = FEATURES.find(x => x.id === f);
            return (
              <span key={f} className="bg-[rgba(16,185,129,0.15)] text-[#10b981] border border-[rgba(16,185,129,0.3)] rounded-[20px] px-2.5 py-0.5 text-[11px] font-semibold flex items-center gap-1">
                <Check size={10} /> +{feat?.label || f}
              </span>
            );
          })}
          {removed.map(f => {
            const feat = FEATURES.find(x => x.id === f);
            return (
              <span key={f} className="bg-[rgba(239,68,68,0.15)] text-[#ef4444] border border-[rgba(239,68,68,0.3)] rounded-[20px] px-2.5 py-0.5 text-[11px] font-semibold flex items-center gap-1">
                <X size={10} /> −{feat?.label || f}
              </span>
            );
          })}
        </div>
      )}

      {/* ── Feature Groups — ALL 20 features ── */}
      {Object.entries(ALL_GROUPED).map(([category, items]) => {
        const enabledInCat = items.filter(f => local.includes(f.id)).length;
        return (
          <div key={category} className="mb-4.5">
            {/* Category header */}
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[var(--color-border)]">
              <span className="text-[10px] font-bold tracking-[0.08em] text-[var(--color-text-muted)] uppercase">
                {category}
              </span>
              <span className={`text-[10px] font-semibold ${enabledInCat > 0 ? "text-[var(--color-teal)]" : "text-[var(--color-text-muted)]"}`}>
                {enabledInCat}/{items.length} on
              </span>
            </div>

            {/* Feature rows — all shown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-1.5">
              {items.map(feature => {
                const enabled     = local.includes(feature.id);
                const isDefault   = defaultFeatures.includes(feature.id);
                const isProtected = (isSelf && feature.id === 'roles_features') || isDefault;
                return (
                  <label
                    key={feature.id}
                    htmlFor={`feat-${userId}-${feature.id}`}
                    className={`flex items-center gap-2 px-2.5 py-[7px] rounded-lg transition-all duration-150 ${isProtected ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${enabled ? "bg-[rgba(20,184,166,0.09)] border border-[rgba(20,184,166,0.22)]" : "bg-white/2 border border-white/5 hover:bg-white/5"}`}
                  >
                    {/* Custom checkbox visual */}
                    <div className={`w-4 h-4 rounded shrink-0 flex items-center justify-center transition-all duration-150 border-2 ${enabled ? "border-[var(--color-teal)] bg-[var(--color-teal)]" : "border-white/20 bg-transparent"}`}>
                      {enabled && <Check size={10} color="#fff" strokeWidth={3} />}
                    </div>
                    <input
                      id={`feat-${userId}-${feature.id}`}
                      type="checkbox"
                      checked={enabled}
                      disabled={isProtected}
                      onChange={() => toggle(feature.id)}
                      className="absolute opacity-0 w-0 h-0"
                    />
                    <span className={`text-[12.5px] flex-1 ${enabled ? "font-semibold text-[var(--color-text)]" : "font-normal text-[var(--color-text-muted)]"}`}>
                      {feature.label}
                    </span>
                    {/* Status indicator dot / Lock icon */}
                    {isDefault ? (
                      <span title="Default Feature (Locked)" className="flex items-center">
                        <AlertCircle size={12} color="var(--color-text-muted)" />
                      </span>
                    ) : (
                      <div className={`w-[7px] h-[7px] rounded-full shrink-0 transition-all duration-200 ${enabled ? "bg-[#10b981] shadow-[0_0_6px_#10b98166]" : "bg-white/10"}`} />
                    )}
                    {isProtected && !isDefault && <AlertCircle size={11} color="var(--color-text-muted)" />}
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* ── Action Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-1.5 pt-3.5 border-t border-[var(--color-border)] gap-2">
        <button
          onClick={resetToDefault}
          className="bg-transparent border border-[var(--color-border)] cursor-pointer text-[var(--color-text-muted)] text-[12px] flex items-center gap-[5px] px-3 py-[5px] rounded-lg transition-all duration-150 hover:text-[var(--color-text)] hover:border-[var(--color-text-muted)]"
        >
          <RotateCcw size={12} /> Reset to Role Default
        </button>

        <div className="flex gap-2">
          {isDirty && (
            <button
              onClick={handleDiscard}
              className="flex items-center gap-1.5 px-3.5 h-[34px] rounded-lg text-[12px] font-semibold bg-[rgba(239,68,68,0.1)] text-[#ef4444] border border-[rgba(239,68,68,0.2)] hover:bg-[rgba(239,68,68,0.15)] transition-all duration-200 cursor-pointer"
            >
              <X size={13} /> Discard
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className={`flex items-center gap-1.5 px-4 h-[34px] rounded-lg text-[12px] font-semibold transition-all duration-200 ${(!isDirty || saving) ? "bg-white/5 text-white/40 cursor-not-allowed border border-white/10" : "bg-[rgba(16,185,129,0.15)] text-[#10b981] border border-[rgba(16,185,129,0.3)] hover:bg-[rgba(16,185,129,0.25)] cursor-pointer"}`}
          >
            <Save size={13} />
            {saving ? 'Saving...' : `Save Changes${isDirty ? ` (${added.length + removed.length})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeatureChecklist;
