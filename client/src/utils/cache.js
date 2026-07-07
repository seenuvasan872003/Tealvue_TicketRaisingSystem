// ============================================================
//  client/src/utils/cache.js  —  Cache Utility with TTL
// ============================================================

const PREFIX = 'tealue_';

/**
 * Stores data in localStorage with an expiry time.
 * @param {string} key - Cache key (suffix)
 * @param {any} data - Data to store
 * @param {number} ttlMinutes - Time to live in minutes
 */
export const setCache = (key, data, ttlMinutes) => {
  try {
    const expiry = Date.now() + ttlMinutes * 60000;
    const cacheObj = {
      data,
      expiry,
    };
    localStorage.setItem(PREFIX + key, JSON.stringify(cacheObj));
  } catch (error) {
    console.error('Error writing to cache:', error);
  }
};

/**
 * Retrieves data from localStorage if not expired.
 * @param {string} key - Cache key (suffix)
 * @returns {any|null} Cached data or null if expired or missing
 */
export const getCache = (key) => {
  try {
    const item = localStorage.getItem(PREFIX + key);
    if (!item) return null;

    const cacheObj = JSON.parse(item);
    if (Date.now() > cacheObj.expiry) {
      // Evict expired item
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    return cacheObj.data;
  } catch (error) {
    console.error('Error reading from cache:', error);
    return null;
  }
};

/**
 * Invalidates (removes) a single cache key.
 * @param {string} key - Cache key (suffix)
 */
export const invalidateCache = (key) => {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch (error) {
    console.error('Error invalidating cache key:', error);
  }
};

/**
 * Clears all cache keys that start with the prefix.
 */
export const clearCache = () => {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};
