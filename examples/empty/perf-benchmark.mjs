#!/usr/bin/env node

/**
 * Performance Benchmark Script for Strapi Content Manager
 *
 * This script measures response times for content-manager endpoints
 * to validate performance improvements for deeply nested content.
 *
 * Usage:
 *   1. Start the Strapi server: yarn develop
 *   2. Run this script: node perf-benchmark.mjs
 *
 * Environment variables:
 *   STRAPI_URL - Base URL (default: http://localhost:1337)
 *   ADMIN_EMAIL - Admin email (default: admin@strapi.io)
 *   ADMIN_PASSWORD - Admin password (default: Admin123!)
 *   ITERATIONS - Number of iterations per test (default: 5)
 *   CONTENT_TYPE_UID - Content type to benchmark (default: api::benchmark-page.benchmark-page)
 */

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@strapi.io';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';
const ITERATIONS = parseInt(process.env.ITERATIONS || '5', 10);

const CONTENT_TYPE_UID = process.env.CONTENT_TYPE_UID || 'api::benchmark-page.benchmark-page';

// ============================================================================
// Utility Functions
// ============================================================================

function calculateStats(times) {
  if (times.length === 0) return { avg: 0, min: 0, max: 0, p95: 0 };

  const sorted = [...times].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);

  return {
    avg: Math.round(sum / sorted.length),
    min: Math.round(sorted[0]),
    max: Math.round(sorted[sorted.length - 1]),
    p95: Math.round(sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1]),
  };
}

function formatStats(stats) {
  return `avg: ${stats.avg}ms | min: ${stats.min}ms | max: ${stats.max}ms | p95: ${stats.p95}ms`;
}

async function fetchWithTiming(url, options) {
  const start = performance.now();
  const response = await fetch(url, options);
  const elapsed = performance.now() - start;

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text.substring(0, 200)}`);
  }

  return { response, elapsed, data: await response.json() };
}

// ============================================================================
// Authentication
// ============================================================================

async function authenticate() {
  console.log(`\nAuthenticating as ${ADMIN_EMAIL}...`);

  try {
    const { data } = await fetchWithTiming(`${STRAPI_URL}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      }),
    });

    if (!data.data?.token) {
      throw new Error('No token in response. Have you created an admin user?');
    }

    console.log('Authentication successful!\n');
    return data.data.token;
  } catch (error) {
    console.error('\nAuthentication failed!');
    console.error('Make sure you have:');
    console.error('  1. Started the Strapi server (yarn develop)');
    console.error('  2. Created an admin user with the expected credentials:');
    console.error(`     Email: ${ADMIN_EMAIL}`);
    console.error('     Password: (hidden; set via ADMIN_PASSWORD environment variable)');
    console.error('\nOr set ADMIN_EMAIL and ADMIN_PASSWORD environment variables.\n');
    throw error;
  }
}

// ============================================================================
// Benchmark Tests
// ============================================================================

async function getFirstDocumentId(token) {
  const { data } = await fetchWithTiming(
    `${STRAPI_URL}/content-manager/collection-types/${CONTENT_TYPE_UID}?page=1&pageSize=1`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!data.results || data.results.length === 0) {
    throw new Error(`No entries found for ${CONTENT_TYPE_UID}. Does the content type have data?`);
  }

  return data.results[0].documentId;
}

async function runBenchmark(name, url, token, iterations) {
  const times = [];
  process.stdout.write(`  ${name}: `);

  for (let i = 0; i < iterations; i++) {
    try {
      const { elapsed } = await fetchWithTiming(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      times.push(elapsed);
      process.stdout.write('.');
    } catch (error) {
      process.stdout.write('x');
      console.error(`\n    Error on iteration ${i + 1}: ${error.message}`);
    }
  }

  const stats = calculateStats(times);
  console.log(` ${formatStats(stats)}`);
  return stats;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('='.repeat(70));
  console.log('  STRAPI CONTENT MANAGER PERFORMANCE BENCHMARK');
  console.log('='.repeat(70));

  console.log('\nConfiguration:');
  console.log(`  Server URL: ${STRAPI_URL}`);
  console.log(`  Content Type: ${CONTENT_TYPE_UID}`);
  console.log(`  Iterations: ${ITERATIONS}`);
  console.log(
    `  STRAPI_CONTENT_MANAGER_MAX_POPULATE_DEPTH: ${process.env.STRAPI_CONTENT_MANAGER_MAX_POPULATE_DEPTH || 'unlimited (Infinity)'}`
  );

  // Authenticate
  const token = await authenticate();

  // Get a document ID to test with
  console.log('Finding benchmark document...');
  const documentId = await getFirstDocumentId(token);
  console.log(`  Using document: ${documentId}\n`);

  // Run benchmarks
  console.log('Running benchmarks...\n');

  const results = {};

  // 1. List View (uses populateDeep(1) - should be fast)
  results.listView = await runBenchmark(
    'List View (populateDeep=1)     ',
    `${STRAPI_URL}/content-manager/collection-types/${CONTENT_TYPE_UID}?page=1&pageSize=10`,
    token,
    ITERATIONS
  );

  // 2. Edit View / Find One (uses populateDeep configured depth - the problem area)
  results.editView = await runBenchmark(
    'Edit View (populateDeep=config)',
    `${STRAPI_URL}/content-manager/collection-types/${CONTENT_TYPE_UID}/${documentId}`,
    token,
    ITERATIONS
  );

  // 3. Count Draft Relations (known slow endpoint)
  results.countDraftRelations = await runBenchmark(
    'Count Draft Relations         ',
    `${STRAPI_URL}/content-manager/collection-types/${CONTENT_TYPE_UID}/${documentId}/actions/countDraftRelations`,
    token,
    ITERATIONS
  );

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('  SUMMARY');
  console.log('='.repeat(70));
  console.log(`
  List View:            ${results.listView.avg}ms avg (baseline, populateDeep=1)
  Edit View:            ${results.editView.avg}ms avg (populateDeep=configured)
  Count Draft Relations: ${results.countDraftRelations.avg}ms avg

  Edit/List Ratio: ${(results.editView.avg / results.listView.avg).toFixed(1)}x slower
  `);

  // Performance assessment
  if (results.editView.avg > 1000) {
    console.log('  Status: SLOW - Edit view > 1000ms');
    console.log('  Recommendation: Set STRAPI_CONTENT_MANAGER_MAX_POPULATE_DEPTH=4');
  } else if (results.editView.avg > 500) {
    console.log('  Status: MODERATE - Edit view 500-1000ms');
    console.log('  Consider: Reducing populate depth or component nesting');
  } else {
    console.log('  Status: GOOD - Edit view < 500ms');
  }

  console.log('\n' + '='.repeat(70) + '\n');
}

main().catch((error) => {
  console.error('\nBenchmark failed:', error.message);
  process.exit(1);
});
