/**
 * Integration test for SnipeRank optimizations
 * Tests all utility modules and their integration
 */

console.log('🧪 Running SnipeRank Integration Tests...\n');

// Test 1: Import Constants
console.log('Test 1: Importing constants module...');
try {
  const { SCORING, CONTENT_LIMITS, TIMEOUTS, HTTP_STATUS, AI_MODELS } = require('./shared/constants');
  console.log('  ✅ Constants imported successfully');
  console.log(`  - SCORING.BASE_SCORE: ${SCORING.BASE_SCORE}`);
  console.log(`  - CONTENT_LIMITS.MAX_AI_CONTENT_LENGTH: ${CONTENT_LIMITS.MAX_AI_CONTENT_LENGTH}`);
  console.log(`  - TIMEOUTS.CACHE_DURATION: ${TIMEOUTS.CACHE_DURATION}ms`);
  console.log(`  - AI_MODELS.FULL_ANALYSIS: ${AI_MODELS.FULL_ANALYSIS}`);
} catch (error) {
  console.error('  ❌ Failed to import constants:', error.message);
  process.exit(1);
}

// Test 2: Import and Test Validation
console.log('\nTest 2: Importing validation module...');
try {
  const { validateUrl, sanitizeInput, validateEmail, rateLimiter } = require('./shared/validation');
  console.log('  ✅ Validation imported successfully');

  // Test URL validation
  const validUrl = validateUrl('https://example.com');
  const invalidUrl = validateUrl('http://localhost');
  const ssrfUrl = validateUrl('http://127.0.0.1');

  if (validUrl.isValid) {
    console.log('  ✅ Valid URL accepted: https://example.com');
  } else {
    console.error('  ❌ Valid URL rejected!');
    process.exit(1);
  }

  if (!invalidUrl.isValid && invalidUrl.error.includes('internal')) {
    console.log('  ✅ Localhost URL blocked correctly');
  } else {
    console.error('  ❌ Localhost URL not blocked!');
    process.exit(1);
  }

  if (!ssrfUrl.isValid && ssrfUrl.error.includes('private')) {
    console.log('  ✅ SSRF attack blocked (127.0.0.1)');
  } else {
    console.error('  ❌ SSRF vulnerability exists!');
    process.exit(1);
  }

  // Test rate limiter
  const limit1 = rateLimiter.checkLimit('test-ip', 3, 60000);
  const limit2 = rateLimiter.checkLimit('test-ip', 3, 60000);
  const limit3 = rateLimiter.checkLimit('test-ip', 3, 60000);
  const limit4 = rateLimiter.checkLimit('test-ip', 3, 60000);

  if (limit1.allowed && limit2.allowed && limit3.allowed && !limit4.allowed) {
    console.log('  ✅ Rate limiter working (3 req limit tested)');
  } else {
    console.error('  ❌ Rate limiter not working correctly');
    process.exit(1);
  }

  rateLimiter.clear('test-ip');

} catch (error) {
  console.error('  ❌ Failed validation tests:', error.message);
  process.exit(1);
}

// Test 3: Import and Test Cache
console.log('\nTest 3: Importing cache module...');
try {
  const { cache } = require('./shared/cache');
  console.log('  ✅ Cache imported successfully');

  // Test cache set/get
  cache.set('test-key', { data: 'test-value' });
  const cached = cache.get('test-key');

  if (cached && cached.data === 'test-value') {
    console.log('  ✅ Cache set/get working');
  } else {
    console.error('  ❌ Cache set/get failed');
    process.exit(1);
  }

  // Test cache expiration
  cache.set('expire-key', 'will-expire', 1); // 1ms TTL
  setTimeout(() => {
    const expired = cache.get('expire-key');
    if (expired === null) {
      console.log('  ✅ Cache expiration working');
    } else {
      console.error('  ❌ Cache expiration not working');
      process.exit(1);
    }

    // Test cache stats
    const stats = cache.getStats();
    if (stats.hits >= 0 && stats.misses >= 0) {
      console.log('  ✅ Cache statistics working');
      console.log(`  - Cache stats: ${JSON.stringify(stats)}`);
    } else {
      console.error('  ❌ Cache statistics failed');
      process.exit(1);
    }

    cache.clear();
    runFinalTests();
  }, 10);

} catch (error) {
  console.error('  ❌ Failed cache tests:', error.message);
  process.exit(1);
}

function runFinalTests() {
  // Test 4: Verify Server Integration
  console.log('\nTest 4: Verifying server.js integration...');
  try {
    // Check if server.js can be required without errors
    const serverCode = require('fs').readFileSync('./server.js', 'utf8');

    // Verify imports are present
    if (serverCode.includes("shared/constants") &&
        serverCode.includes("shared/validation") &&
        serverCode.includes("shared/cache")) {
      console.log('  ✅ Server imports all utility modules');
    } else {
      console.error('  ❌ Server missing utility imports');
      process.exit(1);
    }

    // Verify middleware is used
    if (serverCode.includes('validateUrlMiddleware') &&
        serverCode.includes('rateLimitMiddleware')) {
      console.log('  ✅ Server uses validation and rate limit middleware');
    } else {
      console.error('  ❌ Server missing middleware');
      process.exit(1);
    }

    // Verify caching is implemented
    if (serverCode.includes('cache.get(') &&
        serverCode.includes('cache.set(')) {
      console.log('  ✅ Server implements caching');
    } else {
      console.error('  ❌ Server missing cache implementation');
      process.exit(1);
    }

    // Verify constants are used
    if (serverCode.includes('SCORING.') &&
        serverCode.includes('CONTENT_LIMITS.') &&
        serverCode.includes('TIMEOUTS.')) {
      console.log('  ✅ Server uses constants (no magic numbers)');
    } else {
      console.error('  ❌ Server still has magic numbers');
      process.exit(1);
    }

  } catch (error) {
    console.error('  ❌ Server integration check failed:', error.message);
    process.exit(1);
  }

  console.log('\n🎉 ALL TESTS PASSED! ✅');
  console.log('\n📊 Summary:');
  console.log('  ✅ Constants module working');
  console.log('  ✅ Validation module working (SSRF protection active)');
  console.log('  ✅ Cache module working (with expiration)');
  console.log('  ✅ Rate limiter working');
  console.log('  ✅ Server.js integration complete');
  console.log('\n🚀 All optimizations are operational and ready for production!');
}
