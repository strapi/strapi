/* -------------------------------------------------------------------------------------------------
 * setupDatabaseReset
 * -----------------------------------------------------------------------------------------------*/

// Store initial database state for reset
let initialTestData = {};
let isTestDataCaptured = false;
let allTableNames = [];

/**
 * Capture the initial state of all database tables for later restoration
 */
async function captureInitialTestData() {
  if (isTestDataCaptured) return;

  initialTestData = {};

  // Use Strapi's built-in dialect system to get table names
  allTableNames = await strapi.db.dialect.schemaInspector.getTables();

  for (const tableName of allTableNames) {
    try {
      const data = await strapi.db.connection(tableName).select('*');
      initialTestData[tableName] = data;
    } catch (error) {
      console.warn(`Could not capture data for table ${tableName}:`, error.message);
      initialTestData[tableName] = [];
    }
  }

  isTestDataCaptured = true;
}

async function resetTestDatabase() {
  // Use Strapi's built-in schema update mechanism to disable constraints (e.g. foreign key constraints)
  await strapi.db.dialect.startSchemaUpdate();

  try {
    for (const tableName of allTableNames) {
      try {
        // Clear the table
        await strapi.db.connection(tableName).del();

        // Restore initial data if any
        const initialData = initialTestData[tableName];
        if (initialData && initialData.length > 0) {
          await strapi.db.connection(tableName).insert(initialData);
        }
      } catch (error) {
        console.warn(`Could not reset table ${tableName}:`, error.message);
      }
    }
  } finally {
    // Always re-enable constraints
    await strapi.db.dialect.endSchemaUpdate();
  }
}

/**
 * Setup database reset for a test suite
 * Call this in your describe block to automatically reset after each test
 *
 * NOTE:
 * Only use sparingly where needed as the operation is slower than testInTransaction
 */
export function setupDatabaseReset() {
  let isDataCaptured = false;

  beforeEach(async () => {
    if (!isDataCaptured) {
      await captureInitialTestData();
      isDataCaptured = true;
    }
  });

  afterEach(async () => {
    if (isDataCaptured) {
      await resetTestDatabase();
    }
  });
}

/* -------------------------------------------------------------------------------------------------
 * testInTransaction
 * -----------------------------------------------------------------------------------------------*/

export const wrapInTransaction = (test) => {
  return async (...args) => {
    await strapi.db.transaction(async ({ trx, rollback }) => {
      await test(trx, ...args);
      await rollback();
    });
  };
};

/**
 * Resets the database by leveragin a transaction rollback
 *
 * NOTE:
 * Alternatively, use setupDatabaseReset() which is slower but avoids errors thrown by asnyc operations
 * executed after the test's transaction context has closed.
 */
export const testInTransaction = (...args: Parameters<jest.It>) => {
  if (args.length > 1) {
    return it(
      args[0], // name
      wrapInTransaction(args[1]), // fn
      args[2] // timeout
    );
  }
  return it(...args);
};

testInTransaction.skip = it.skip as jest.It['skip'];
testInTransaction.only = it.only as jest.It['only'];
testInTransaction.todo = it.todo as jest.It['todo'];
testInTransaction.each = it.each as jest.It['each'];
