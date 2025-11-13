/**
 * Shared constants for SnipeRank application
 * Centralizes magic numbers and configuration values
 */

// Scoring constants
export const SCORING = {
  // Maximum number of issues that can contribute to score penalty
  MAX_ISSUE_WEIGHT: 30,

  // Issue weight multiplier (each issue reduces score by this factor)
  ISSUE_WEIGHT_MULTIPLIER: 1.5,

  // Performance score adjustment weight
  PERFORMANCE_WEIGHT: 0.4,

  // Performance score baseline (scores above this add points, below subtract)
  PERFORMANCE_BASELINE: 50,

  // Default fallback score when analysis fails
  DEFAULT_FALLBACK_SCORE: 50,

  // Minimum score
  MIN_SCORE: 0,

  // Maximum score
  MAX_SCORE: 100
};

// Content limits
export const CONTENT_LIMITS = {
  // Maximum characters to send to AI for analysis
  MAX_AI_CONTENT_LENGTH: 12000,

  // Maximum number of opportunities to show in quick analysis
  QUICK_ANALYSIS_MAX_OPPORTUNITIES: 10,

  // Maximum number of strengths to show in quick analysis
  QUICK_ANALYSIS_MAX_STRENGTHS: 5,

  // Minimum number of items to show (will pad with generic if needed)
  MIN_DISPLAY_ITEMS: 5,

  // Maximum number of opportunities in full analysis
  FULL_ANALYSIS_MAX_OPPORTUNITIES: 25,

  // Maximum number of strengths in full analysis
  FULL_ANALYSIS_MAX_STRENGTHS: 10
};

// API timeouts (in milliseconds)
export const TIMEOUTS = {
  // PageSpeed API timeout
  PAGESPEED_TIMEOUT: 30000, // 30 seconds

  // Website fetch timeout
  WEBSITE_FETCH_TIMEOUT: 15000, // 15 seconds

  // OpenAI API timeout
  OPENAI_TIMEOUT: 60000, // 60 seconds

  // Cache duration (24 hours)
  CACHE_DURATION: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
};

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// AI Models
export const AI_MODELS = {
  QUICK_ANALYSIS: 'gpt-3.5-turbo',
  FULL_ANALYSIS: 'gpt-4-turbo'
};

// Score bands for display
export const SCORE_BANDS = {
  EXCELLENT: { min: 80, max: 100, label: 'Excellent' },
  GOOD: { min: 60, max: 79, label: 'Good' },
  FAIR: { min: 40, max: 59, label: 'Fair' },
  POOR: { min: 0, max: 39, label: 'Needs Work' }
};

/**
 * Get score band label for a given score
 * @param {number} score - Score value (0-100)
 * @returns {string} Band label
 */
export function getScoreBand(score) {
  for (const [, band] of Object.entries(SCORE_BANDS)) {
    if (score >= band.min && score <= band.max) {
      return band.label;
    }
  }
  return SCORE_BANDS.POOR.label;
}
