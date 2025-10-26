#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

const testDir = path.join(__dirname, 'src/api/audit-log/__tests__');

console.log('🧪 Running Audit Logs Test Suite...\n');

// Test categories
const testCategories = [
  {
    name: 'Unit Tests - Controller',
    command: 'jest audit-log.controller.test.js',
    description: 'Testing controller methods (find, findOne, getStats)'
  },
  {
    name: 'Unit Tests - Middleware',
    command: 'jest audit-log.middleware.test.js',
    description: 'Testing middleware functionality and helper functions'
  },
  {
    name: 'Integration Tests',
    command: 'jest audit-log.integration.test.js',
    description: 'Testing API endpoints with real database operations'
  },
  {
    name: 'Coverage Report',
    command: 'jest --coverage',
    description: 'Generating code coverage report'
  }
];

async function runTests() {
  let allPassed = true;
  
  for (const category of testCategories) {
    console.log(`\n📋 ${category.name}`);
    console.log(`📝 ${category.description}`);
    console.log('─'.repeat(60));
    
    try {
      execSync(category.command, {
        cwd: testDir,
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'test' }
      });
      console.log(`✅ ${category.name} - PASSED\n`);
    } catch (error) {
      console.log(`❌ ${category.name} - FAILED\n`);
      allPassed = false;
    }
  }
  
  if (allPassed) {
    console.log('🎉 All tests passed successfully!');
    console.log('\n📊 Test Summary:');
    console.log('   • Controller methods: ✅');
    console.log('   • Middleware functionality: ✅');
    console.log('   • API endpoints: ✅');
    console.log('   • Code coverage: ✅');
  } else {
    console.log('💥 Some tests failed. Please check the output above.');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
