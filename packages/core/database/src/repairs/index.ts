import type { Modules } from '@strapi/types';

import type { Database } from '..';
import { removeOrphanMorphType as removeOrphanMorphTypeFunc } from './operations/remove-orphan-morph-types';
import { processUnidirectionalJoinTables } from './operations/process-unidirectional-join-tables';
import { asyncCurry } from '../utils/async-curry';

export const createRepairManager = (db: Database): RepairManager => {
  return {
    removeOrphanMorphType: asyncCurry(removeOrphanMorphTypeFunc)(db),
    processUnidirectionalJoinTables: asyncCurry(processUnidirectionalJoinTables)(db),
  };
};

export type RepairManager = Modules.Database.RepairManager;
