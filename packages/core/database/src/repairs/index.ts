import type { Database } from '..';
import { removeOrphanMorphType as removeOrphanMorphTypeFunc } from './operations/remove-orphan-morph-types';
import { asyncCurry } from '../utils/async-curry';
import { removeOrphanUnidirectionalRelations } from './operations/remove-orphan-unidirectional-relations';

export const createRepairManager = (db: Database) => {
  return {
    removeOrphanMorphType: asyncCurry(removeOrphanMorphTypeFunc)(db),
    removeOrphanUnidirectionalRelations: () => removeOrphanUnidirectionalRelations(db),
  };
};

export type RepairManager = ReturnType<typeof createRepairManager>;
