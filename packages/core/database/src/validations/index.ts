import { validateRelations } from './relations';

import type { Database } from '..';
import { MetadataOptions } from '../types';

/**
 * Validate if the database is in a valid state before starting the server.
 */
export async function validateDatabase(db: Database, options: MetadataOptions) {
  await validateRelations(db, options);
}
