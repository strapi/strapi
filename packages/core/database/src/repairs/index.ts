import { curry } from 'lodash/fp';
import type { Database } from '..';
import { removeOrphanMorphType as removeOrphanMorphTypeFunc } from './operations/remove-orphan-morph-types';

export const createRepairManager = (db: Database) => {
  return {
    removeOrphanMorphType: curry(removeOrphanMorphTypeFunc)(db),
  };
};

export type RepairManager = ReturnType<typeof createRepairManager>;
