import type { ClientName } from '../types';

const sqlClientModule = {
  mysql: { mysql2: '3.6.0' },
  postgres: { pg: '8.8.0' },
  sqlite: { 'better-sqlite3': '9.0.0' },
};

/**
 * Client dependencies
 */
export default ({ client }: { client: ClientName }) => {
  if (client in sqlClientModule) {
    return {
      ...sqlClientModule[client],
    };
  }

  throw new Error(`Invalid client "${client}"`);
};
