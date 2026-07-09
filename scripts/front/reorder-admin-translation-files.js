#!/usr/bin/env node
'use strict';

/**
 * @deprecated Use `yarn verify:translations --fix` instead.
 */
const { execSync } = require('node:child_process');
const path = require('node:path');

execSync('yarn verify:translations --fix', {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..', '..'),
});
