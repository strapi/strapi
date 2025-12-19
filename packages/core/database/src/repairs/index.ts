import type { Database } from '..';
import { removeOrphanMorphType as removeOrphanMorphTypeFunc } from './operations/remove-orphan-morph-types';
import { processUnidirectionalJoinTables } from './operations/process-unidirectional-join-tables';
import { asyncCurry } from '../utils/async-curry';

export const createRepairManager = (db: Database) => {
  return {
    removeOrphanMorphType: asyncCurry(removeOrphanMorphTypeFunc)(db),
    processUnidirectionalJoinTables: asyncCurry(processUnidirectionalJoinTables)(db),
  };
};

export type RepairManager = ReturnType<typeof createRepairManager>;
