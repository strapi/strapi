import type { Database } from '..';
import type { QueryBuilder } from './query-builder';

export interface Ctx {
  qb: QueryBuilder;
  uid: string;
  db: Database;
}
