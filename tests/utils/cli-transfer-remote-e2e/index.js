'use strict';

/**
 * Helpers for CLI remote transfer e2e (pull-remote / push-remote Jest suites).
 *
 * - {@link ./upload-db.js} — SQLite file counts & seed-row signatures (in-process, no child scripts)
 * - {@link ./seed-media.js} — programmatic seed + CLI shim target
 * - {@link ./timeouts.js} — runner / Jest timeouts (also required directly from cli-runner)
 * - {@link ./constants.js} — shared seed filename prefix
 * - {@link ./stop-remote-process.js} — start / teardown helpers for background remote Strapi
 */

const path = require('path');
const { spawn } = require('child_process');

const { countUploadFiles, getSeedUploadSignature } = require('./upload-db');
const { seedTransferTestMedia } = require('./seed-media');
const { getRemotePort, waitForHttpOk } = require('./http');
const { stopRemoteStrapiProcess } = require('./stop-remote-process');
const timeouts = require('./timeouts');

const REPO_ROOT = path.join(__dirname, '..', '..', '..');
const APP_TEMPLATE_CONSTANTS = path.join(REPO_ROOT, 'tests', 'app-template', 'src', 'constants.js');

function startRemoteStrapiProcess(appPath, { port }) {
  return spawn('npm', ['run', '-s', 'start'], {
    cwd: appPath,
    detached: process.platform !== 'win32',
    env: {
      ...process.env,
      PORT: port,
      HOST: '127.0.0.1',
    },
    stdio: 'ignore',
  });
}

module.exports = {
  REPO_ROOT,
  APP_TEMPLATE_CONSTANTS,
  getRemotePort,
  waitForHttpOk,
  startRemoteStrapiProcess,
  stopRemoteStrapiProcess,
  countUploadFiles,
  getSeedUploadSignature,
  seedTransferTestMedia,
  ...timeouts,
};
