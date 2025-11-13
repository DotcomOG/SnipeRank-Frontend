/**
 * Simple in-memory cache for API results
 * For production, consider using Redis or similar distributed cache
 */

const { TIMEOUTS } = require('./constants');

class Cache {
  constructor() {
    this.store = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0
    };
  }

  /**
   * Generate cache key from URL
   * @param {string} url - URL to generate key for
   * @param {string} prefix - Optional prefix for the key
   * @returns {string} Cache key
   */
  generateKey(url, prefix = '') {
    const normalizedUrl = url.toLowerCase().trim();
    return prefix ? `${prefix}:${normalizedUrl}` : normalizedUrl;
  }

  /**
   * Get cached value
   * @param {string} key - Cache key
   * @returns {any|null} Cached value or null if not found/expired
   */
  get(key) {
    const entry = this.store.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.value;
  }

  /**
   * Set cache value
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds (default: 24 hours)
   */
  set(key, value, ttl = TIMEOUTS.CACHE_DURATION) {
    const expiresAt = Date.now() + ttl;

    this.store.set(key, {
      value,
      expiresAt,
      createdAt: Date.now()
    });

    this.stats.sets++;
  }

  /**
   * Check if key exists and is not expired
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists and is valid
   */
  has(key) {
    const entry = this.store.get(key);

    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete cached value
   * @param {string} key - Cache key
   * @returns {boolean} True if key was deleted
   */
  delete(key) {
    return this.store.delete(key);
  }

  /**
   * Clear all cached values
   */
  clear() {
    this.store.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0
    };
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : 0;

    return {
      ...this.stats,
      size: this.store.size,
      hitRate: `${hitRate}%`
    };
  }

  /**
   * Clean up expired entries
   * @returns {number} Number of entries removed
   */
  cleanup() {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Get or set pattern - useful for read-through caching
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Async function to fetch value if not cached
   * @param {number} ttl - Time to live in milliseconds
   * @returns {Promise<any>} Cached or fetched value
   */
  async getOrSet(key, fetchFn, ttl = TIMEOUTS.CACHE_DURATION) {
    // Try to get from cache first
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch new value
    const value = await fetchFn();

    // Cache it
    this.set(key, value, ttl);

    return value;
  }

  /**
   * Get cache entries count by prefix
   * @param {string} prefix - Key prefix to filter by
   * @returns {number} Number of entries with given prefix
   */
  countByPrefix(prefix) {
    let count = 0;

    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        count++;
      }
    }

    return count;
  }

  /**
   * Delete all entries with given prefix
   * @param {string} prefix - Key prefix to filter by
   * @returns {number} Number of entries deleted
   */
  deleteByPrefix(prefix) {
    let deleted = 0;

    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        deleted++;
      }
    }

    return deleted;
  }
}

// Export singleton instance
const cache = new Cache();

// Run cleanup every hour
setInterval(() => {
  const removed = cache.cleanup();
  if (removed > 0) {
    console.log(`Cache cleanup: removed ${removed} expired entries`);
  }
}, 60 * 60 * 1000);

module.exports = {
  Cache,
  cache
};
