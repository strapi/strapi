type SchemaBuilder = {
  rollback(): Promise<unknown>;
};

type ApiHandler = {
  rollback(uid: string): Promise<void>;
  clearGenerated(apiName: string): Promise<void>;
  finalize(uid: string): Promise<void>;
};

export const finalizeSchemaMutation = async ({
  apiHandler,
  backedUpApiUids = [],
}: {
  apiHandler: ApiHandler;
  backedUpApiUids?: string[];
}) => {
  const errors: unknown[] = [];

  for (const uid of backedUpApiUids) {
    try {
      await apiHandler.finalize(uid);
    } catch (error) {
      errors.push(error);
    }
  }

  return errors;
};

/**
 * Restores the filesystem artifacts touched before content-structure reconciliation.
 * Folder reconciliation is deliberately the final mutation, so groups.json never needs a
 * compensating write when an earlier schema or API operation fails.
 */
export const rollbackSchemaMutation = async ({
  builder,
  apiHandler,
  backedUpApiUids = [],
  generatedApiNames = [],
  schemaAlreadyRolledBack = false,
}: {
  builder: SchemaBuilder;
  apiHandler: ApiHandler;
  backedUpApiUids?: string[];
  generatedApiNames?: string[];
  schemaAlreadyRolledBack?: boolean;
}) => {
  const errors: unknown[] = [];
  const attempt = async (operation: () => Promise<unknown>) => {
    try {
      await operation();
    } catch (error) {
      errors.push(error);
    }
  };

  // A generator can fail before a schema directory exists, so remove its partial API before
  // asking the schema handler to roll back. Every action is attempted even if an earlier one
  // fails, ensuring compensation is best-effort rather than short-circuiting.
  for (const apiName of generatedApiNames) {
    await attempt(() => apiHandler.clearGenerated(apiName));
  }

  if (!schemaAlreadyRolledBack) {
    await attempt(() => builder.rollback());
  }

  for (const uid of backedUpApiUids) {
    await attempt(() => apiHandler.rollback(uid));
  }

  if (errors.length > 0) {
    throw errors[0];
  }
};
