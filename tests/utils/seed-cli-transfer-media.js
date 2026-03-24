#!/usr/bin/env node
'use strict';

/**
 * CLI shim for programmatic seeding — implementation lives in cli-transfer-remote-e2e/seed-media.js.
 *
 *   node tests/utils/seed-cli-transfer-media.js [appPath]
 *
 * Env: TRANSFER_CLI_MEDIA_COUNT, TRANSFER_CLI_MEDIA_BYTES (see tests/cli/README.md)
 */

require('./cli-transfer-remote-e2e/seed-media')
  .runFromCli(process.argv)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
