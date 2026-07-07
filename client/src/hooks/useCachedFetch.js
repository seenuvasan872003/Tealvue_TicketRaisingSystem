// ============================================================
//  client/src/hooks/useCachedFetch.js  —  Caching Hook
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { getCache, setCache } from '../utils/cache';

/**
 * A custom React hook that integrates localStorage caching with a fallback fetch.
 * @param {string} cacheKeySuffix - The key name without the tealue_ prefix
 * @param {number} ttlMinutes - Expiry time of cache in minutes
 * @param {function} fetchApiFn - API call function returning a promise
 * @param {Array} dependencies - State dependencies that trigger a refetch if changed
 */
export const useCachedFetch = (cacheKeySuffix, ttlMinutes, fetchApiFn, dependencies = []) => {
  const [data, setData] = useState(() => getCache(cacheKeySuffix));
  const [loading, setLoading] = useState(!data);

  const refresh = useCallback(async (...args) => {
    try {
      const response = await fetchApiFn(...args);
      // Handle both full axios responses and direct data structures
      const fetchedData = response && response.data !== undefined ? response.data : response;
      setData(fetchedData);
      setCache(cacheKeySuffix, fetchedData, ttlMinutes);
      return fetchedData;
    } catch (error) {
      console.error(`useCachedFetch failed for key ${cacheKeySuffix}:`, error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [cacheKeySuffix, ttlMinutes, ...dependencies]);

  useEffect(() => {
    const cachedVal = getCache(cacheKeySuffix);
    if (cachedVal === null || cachedVal === undefined) {
      setLoading(true);
      refresh();
    } else {
      setData(cachedVal);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKeySuffix, ...dependencies]);

  return { data, setData, loading, refresh };
};

export default useCachedFetch;
