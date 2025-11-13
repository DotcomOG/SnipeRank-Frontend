/**
 * Input validation utilities for SnipeRank
 * Includes security measures to prevent SSRF and other attacks
 */

// Private IP ranges to block (RFC 1918, RFC 4193, etc.)
const PRIVATE_IP_RANGES = [
  /^127\./,                    // Loopback
  /^10\./,                     // Private class A
  /^172\.(1[6-9]|2[0-9]|3[01])\./, // Private class B
  /^192\.168\./,               // Private class C
  /^169\.254\./,               // Link-local
  /^::1$/,                     // IPv6 loopback
  /^fe80:/i,                   // IPv6 link-local
  /^fc00:/i,                   // IPv6 unique local
  /^fd00:/i                    // IPv6 unique local
];

// Blocked hostnames
const BLOCKED_HOSTNAMES = [
  'localhost',
  '0.0.0.0',
  'metadata.google.internal',  // GCP metadata
  '169.254.169.254'             // AWS/Azure metadata
];

/**
 * Validates a URL and checks for SSRF vulnerabilities
 * @param {string} urlString - URL to validate
 * @returns {Object} { isValid: boolean, error?: string, url?: URL }
 */
function validateUrl(urlString) {
  // Basic validation
  if (!urlString || typeof urlString !== 'string') {
    return { isValid: false, error: 'URL is required' };
  }

  // Check URL length
  if (urlString.length > 2048) {
    return { isValid: false, error: 'URL is too long' };
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(urlString);
  } catch (error) {
    return { isValid: false, error: 'Invalid URL format' };
  }

  // Only allow HTTP and HTTPS protocols
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return {
      isValid: false,
      error: 'Only HTTP and HTTPS protocols are allowed'
    };
  }

  // Check for blocked hostnames
  const hostname = parsedUrl.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    return {
      isValid: false,
      error: 'Access to internal URLs is not allowed'
    };
  }

  // Check for private IP addresses
  for (const pattern of PRIVATE_IP_RANGES) {
    if (pattern.test(hostname)) {
      return {
        isValid: false,
        error: 'Access to private IP addresses is not allowed'
      };
    }
  }

  // Check for credential injection in URL
  if (parsedUrl.username || parsedUrl.password) {
    return {
      isValid: false,
      error: 'URLs with credentials are not allowed'
    };
  }

  return { isValid: true, url: parsedUrl };
}

/**
 * Sanitizes user input to prevent injection attacks
 * @param {string} input - User input to sanitize
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized input
 */
function sanitizeInput(input, maxLength = 1000) {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Trim and limit length
  let sanitized = input.trim().slice(0, maxLength);

  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return sanitized;
}

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Rate limiting helper - simple in-memory implementation
 * For production, use Redis or similar distributed cache
 */
class RateLimiter {
  constructor() {
    this.requests = new Map();
  }

  /**
   * Check if request is allowed based on rate limit
   * @param {string} identifier - Unique identifier (IP, user ID, etc.)
   * @param {number} maxRequests - Maximum requests allowed
   * @param {number} windowMs - Time window in milliseconds
   * @returns {Object} { allowed: boolean, remaining: number, resetTime: number }
   */
  checkLimit(identifier, maxRequests = 10, windowMs = 60000) {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or initialize request history for this identifier
    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, []);
    }

    let requestTimes = this.requests.get(identifier);

    // Remove requests outside the current window
    requestTimes = requestTimes.filter(time => time > windowStart);

    // Check if limit exceeded
    if (requestTimes.length >= maxRequests) {
      const oldestRequest = requestTimes[0];
      const resetTime = oldestRequest + windowMs;

      return {
        allowed: false,
        remaining: 0,
        resetTime: resetTime
      };
    }

    // Add current request
    requestTimes.push(now);
    this.requests.set(identifier, requestTimes);

    return {
      allowed: true,
      remaining: maxRequests - requestTimes.length,
      resetTime: now + windowMs
    };
  }

  /**
   * Clear rate limit data for identifier
   * @param {string} identifier - Identifier to clear
   */
  clear(identifier) {
    this.requests.delete(identifier);
  }

  /**
   * Clear all rate limit data
   */
  clearAll() {
    this.requests.clear();
  }

  /**
   * Clean up old entries (call periodically)
   */
  cleanup(windowMs = 60000) {
    const now = Date.now();
    const cutoff = now - windowMs;

    for (const [identifier, requestTimes] of this.requests.entries()) {
      const filtered = requestTimes.filter(time => time > cutoff);

      if (filtered.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, filtered);
      }
    }
  }
}

// Export singleton instance
const rateLimiter = new RateLimiter();

// Cleanup old rate limit entries every 5 minutes
setInterval(() => {
  rateLimiter.cleanup();
}, 5 * 60 * 1000);

module.exports = {
  validateUrl,
  sanitizeInput,
  validateEmail,
  RateLimiter,
  rateLimiter
};
