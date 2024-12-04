import type { Database } from '..';
import { removeOrphanMorphTypes } from './operations/remove-orphan-morph-types';
import type { Operation, RepairManager } from './types';

export type * from './types';

export const createRepairManager = (db: Database): RepairManager => {
  // List of operations to be registered dynamically, typed according to the Operation type
  const operations: Record<string, Operation<any>> = {
    removeOrphanMorphTypes: {
      method: removeOrphanMorphTypes,
      logMessage: 'Running removeOrphanMorphTypes with options: ',
    },
    // Add more operations here if needed
  };

  // This is the handler for executing operations
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
      const result = operation.method(db, options); // Call the operation's method
      db.logger.debug(`Operation ${operationName} succeeded`);
      return { success: true, data: result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      db.logger.error(`Error running ${operationName}: ${errorMessage}`);
      throw error;
    }
  };

  // Dynamically add methods to RepairManager
  const repairManager: RepairManager = {};

  for (const [operationName] of Object.entries(operations)) {
    repairManager[operationName] = async <TOptions>(options: TOptions): Promise<any> => {
      return handleOperation(operationName, options);
    };
  }

  return repairManager;
};
