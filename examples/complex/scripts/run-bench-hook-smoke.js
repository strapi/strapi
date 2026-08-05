#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Launcher for bench-hook-smoke.js — sets STRAPI_BENCH_HOOK_OUTPUT then spawns
 * node with `--require ./bench-hook.js` so the preload is active before the smoke.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const hookPath = path.join(__dirname, 'bench-hook.js');
const smokePath = path.join(__dirname, 'bench-hook-smoke.js');
const outputPath = path.join(os.tmpdir(), `strapi-bench-hook-smoke-${process.pid}.json`);

const result = spawnSync(process.execPath, ['--require', hookPath, smokePath], {
  stdio: 'inherit',
  env: {
    ...process.env,
    STRAPI_BENCH_HOOK_OUTPUT: outputPath,
  },
  cwd: path.join(__dirname, '..'),
});

try {
  fs.unlinkSync(outputPath);
} catch {
  // ignore missing output on failure paths
}

process.exit(result.status ?? 1);
