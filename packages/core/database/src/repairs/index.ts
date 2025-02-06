import type { Database } from '..';
import { removeOrphanMorphType as removeOrphanMorphTypeFunc } from './operations/remove-orphan-morph-types';
import { asyncCurry } from '../utils/async-curry';

export const createRepairManager = (db: Database) => {
  return {
    removeOrphanMorphType: asyncCurry(removeOrphanMorphTypeFunc)(db),
  };
};

export type RepairManager = ReturnType<typeof createRepairManager>;
