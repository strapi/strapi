import { validateBidirectionalRelations } from './bidirectional';

import type { Database } from '../..';

/**
 * Validates if relations data and tables are in a valid state before
 * starting the server.
 */
export const validateRelations = async (db: Database) => {
  await validateBidirectionalRelations(db);
};
