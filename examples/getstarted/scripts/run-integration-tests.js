#!/usr/bin/env node
const { spawnSync } = require('child_process');
const path = require('path');

const script = path.resolve(__dirname, 'integration-test-audit.js');
console.log('Running integration audit script:', script);

const result = spawnSync(process.execPath, [script], { stdio: 'inherit' });
if (result.error) {
  console.error('Failed to run script:', result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);
