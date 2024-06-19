import type { Scope } from '../types';

const sqlClientModule = {
  mysql: { mysql2: '3.9.4' },
  postgres: { pg: '8.8.0' },
  sqlite: { 'better-sqlite3': '9.4.3' },
};

export function addDatabaseDependencies(scope: Scope) {
  scope.dependencies = {
    ...scope.dependencies,
    ...sqlClientModule[scope.database.client],
  };
}
