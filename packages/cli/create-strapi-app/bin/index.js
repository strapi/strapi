#!/usr/bin/env node

'use strict';

const { run } = require('../dist/index.js');
const readline = require('readline');

if (process.platform === 'win32') {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.on('SIGINT', function sigint() {
    process.emit('SIGINT');
  });
}

process.on('SIGINT', () => {
  process.exit(1);
});

run(process.argv).then(
  // keep an exit code set during the run, such as a failed admin step
  () => process.exit(process.exitCode ?? 0),
  () => process.exit(1)
);
