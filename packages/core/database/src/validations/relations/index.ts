import { validateBidirectionalRelations } from './bidirectional';

import type { Database } from '../..';
import { MetadataOptions } from '../../types';

/**
 * Validates if relations data and tables are in a valid state before
 * starting the server.
 */
export const validateRelations = async (db: Database, options: MetadataOptions) => {
  await validateBidirectionalRelations(db, options);
};
