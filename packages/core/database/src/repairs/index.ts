import type { Database } from '..';
import { removeOrphanMorphTypes } from './operations/remove-orphan-morph-types';
import type { Operation, RepairManager } from './types';

export type * from './types';

export const createRepairManager = (db: Database): RepairManager => {
  // List of operations to be registered dynamically
  const operations: Record<string, Operation<any>> = {
    removeOrphanMorphTypes: {
      method: removeOrphanMorphTypes,
      logMessage: 'Running removeOrphanMorphTypes with options: ',
    },
  };

  const handleOperation = async <TOptions>(
    operationName: string,
    options: TOptions
  ): Promise<any> => {
    const operation = operations[operationName];

    if (!operation) {
      return {
        success: false,
        error: `Operation ${operationName} not found`,
      };
    }

    db.logger.debug(`${operation.logMessage} ${JSON.stringify(options)}`);
    try {
      // Call the repair operation
      const result = operation.method(db, options);
      db.logger.debug(`Operation ${operationName} succeeded`);
      return { success: true, data: result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      db.logger.error(`Error running ${operationName}: ${errorMessage}`);
      throw error;
    }
  };

  const repairManager: RepairManager = {};

  // Dynamically add methods to RepairManager
  for (const [operationName] of Object.entries(operations)) {
    repairManager[operationName] = async <TOptions>(options: TOptions): Promise<any> => {
      return handleOperation(operationName, options);
    };
  }

  return repairManager;
};
