'use strict';

const fs = require('fs');

const {
  extractExpectedClient,
  readGeneratedDatabaseClient,
  assertGeneratedClientMatches,
  verifyRuntimeDatabase,
  createApiTestAppLoader,
  formatExpectedClient,
  formatGeneratedClient,
  formatRuntimeAssurance,
  redactSecrets,
} = require('./database-assurance');

const usage = 'Usage: verify-api-database-client.js <expected|generated|runtime>';

const readGeneratedEnv = (envPath) => {
  try {
    return fs.readFileSync(envPath, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      throw new Error(`Generated test-apps/api/.env is missing at ${envPath}`);
    }
    throw error;
  }
};

const main = async () => {
  const phase = process.argv[2];
  if (phase !== 'expected' && phase !== 'generated' && phase !== 'runtime') {
    throw new Error(usage);
  }

  const expected = extractExpectedClient(process.env.DB_OPTIONS);

  if (phase === 'expected') {
    process.stdout.write(`${formatExpectedClient(expected)}\n`);
    return;
  }

  const envPath = process.env.ENV_PATH;
  if (typeof envPath !== 'string' || envPath.trim() === '') {
    throw new Error('ENV_PATH is not set');
  }

  if (phase === 'generated') {
    const actual = readGeneratedDatabaseClient(readGeneratedEnv(envPath));
    assertGeneratedClientMatches(expected, actual);
    process.stdout.write(`${formatGeneratedClient(actual)}\n`);
    return;
  }

  const identity = await verifyRuntimeDatabase({
    expected,
    loadInstance: createApiTestAppLoader(envPath),
  });
  process.stdout.write(`${formatRuntimeAssurance(identity)}\n`);
};

if (require.main === module) {
  main().catch((error) => {
    const message = redactSecrets(error && error.message ? error.message : String(error));
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}

module.exports = { main };
