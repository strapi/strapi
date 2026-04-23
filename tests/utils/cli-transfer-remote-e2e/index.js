'use strict';

/**
 * Helpers for CLI remote transfer e2e (pull-remote / push-remote Jest suites).
 *
 * - {@link ./upload-db.js} — SQLite file counts & seed-row signatures (in-process, no child scripts)
 * - {@link ./seed-media.js} — programmatic seed + CLI shim target
 * - {@link ./timeouts.js} — runner / Jest timeouts (also required directly from cli-runner)
 * - {@link ./constants.js} — shared seed filename prefix
 */

const path = require('path');

const { countUploadFiles, getSeedUploadSignature } = require('./upload-db');
const { seedTransferTestMedia } = require('./seed-media');
const { getRemotePort, waitForHttpOk } = require('./http');
const timeouts = require('./timeouts');

const REPO_ROOT = path.join(__dirname, '..', '..', '..');
const APP_TEMPLATE_CONSTANTS = path.join(REPO_ROOT, 'tests', 'app-template', 'src', 'constants.js');

module.exports = {
  REPO_ROOT,
  APP_TEMPLATE_CONSTANTS,
  getRemotePort,
  waitForHttpOk,
  countUploadFiles,
  getSeedUploadSignature,
  seedTransferTestMedia,
  ...timeouts,
};
