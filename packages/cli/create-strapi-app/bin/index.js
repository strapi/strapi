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
  () => process.exit(0),
  () => process.exit(1)
);
