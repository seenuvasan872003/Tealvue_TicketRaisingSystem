// ============================================================
//  server/utils/timeFormat.js  —  Duration Formatting Helper
// ============================================================

/**
 * Formats a duration in milliseconds into a readable string (e.g. 1d 5hr 13min).
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration
 */
const formatDuration = (ms) => {
  if (ms === undefined || ms === null) return 'N/A';
  if (ms < 0) ms = 0;
  
  const totalMinutes = Math.floor(ms / 60000);
  const days    = Math.floor(totalMinutes / 1440);
  const hours   = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  
  const parts = [];
  if (days)    parts.push(`${days}d`);
  if (hours)   parts.push(`${hours}hr`);
  if (minutes) parts.push(`${minutes}min`);
  
  return parts.join(' ') || '< 1 min';
};

module.exports = { formatDuration };
