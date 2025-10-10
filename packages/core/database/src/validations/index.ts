import { validateRelations } from './relations';

import type { Database } from '..';

/**
 * Validate if the database is in a valid state before starting the server.
 */
export async function validateDatabase(db: Database) {
  await validateRelations(db);
}
