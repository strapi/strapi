'use strict';

const path = require('path');

/**
 * @param {string} repoRoot Absolute path to monorepo root
 */
function createContext(repoRoot) {
  const complexDir = path.join(repoRoot, 'examples', 'complex');
  const migrationRoot = path.join(complexDir, '.migration-v5');
  return {
    REPO_ROOT: repoRoot,
    COMPLEX_DIR: complexDir,
    MIGRATION_ROOT: migrationRoot,
    V4_APP_DIR: path.join(migrationRoot, 'v4-app'),
    SQLITE_PATH: path.join(migrationRoot, 'migration.sqlite'),
    DOCKER_COMPOSE_FILE: path.join(complexDir, 'docker-compose.dev.yml'),
    DOTENV_PATH: path.join(repoRoot, 'tests', 'migration', 'v5', '.env'),
  };
}

module.exports = { createContext };
