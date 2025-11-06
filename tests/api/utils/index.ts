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

  const dbClient = strapi.db.connection.client.config.client;

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

/**
 * Reset all database tables to their initial state
 */
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
 * Legacy transaction wrapper
 * -----------------------------------------------------------------------------------------------*/

export const wrapInTransaction = (test) => {
  console.warn('wrapInTransaction is deprecated. Use setupDatabaseReset() instead.');
  return test;
};

// Keep old interface for backward compatibility but log deprecation
export const testInTransaction = (...args: Parameters<jest.It>) => {
  console.warn('testInTransaction is deprecated. Use setupDatabaseReset() instead.');
  return it(...args);
};
