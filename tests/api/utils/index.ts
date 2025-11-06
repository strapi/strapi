interface TestData {
  [tableName: string]: any[];
}

// Store initial database state for reset
let initialTestData: TestData = {};
let isTestDataCaptured = false;
let allTableNames: string[] = [];

/**
 * Capture the initial state of all database tables for later restoration
 */
export async function captureInitialTestData() {
  if (isTestDataCaptured) return;

  initialTestData = {};

  const dbClient = strapi.db.connection.client.config.client;
  console.log('Detected database client:', dbClient);

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
export async function resetTestDatabase() {
  if (!isTestDataCaptured) {
    console.warn('Initial test data not captured. Call captureInitialTestData first.');
    return;
  }

  // Skip system tables that shouldn't be reset
  const systemTables = [
    'strapi_core_store_settings',
    'strapi_database_schema',
    'strapi_migrations',
    'strapi_webhooks',
    'strapi_api_tokens',
    'strapi_api_token_permissions',
    'strapi_transfer_tokens',
    'strapi_transfer_token_permissions',
    'admin_permissions',
    'admin_users',
    'admin_roles',
    'admin_users_roles_links',
    'up_permissions',
    'up_roles',
    'up_users',
    'up_users_role_links',
    'i18n_locale',
  ];

  const tablesToReset = allTableNames.filter(
    (tableName) => !systemTables.includes(tableName) && !tableName.startsWith('strapi_')
  );

  // Use Strapi's built-in schema update mechanism to disable constraints (e.g. foreign key constraints)
  await strapi.db.dialect.startSchemaUpdate();

  try {
    // Reset each table individually to avoid foreign key issues
    for (const tableName of tablesToReset) {
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

testInTransaction.skip = it.skip as jest.It['skip'];
testInTransaction.only = it.only as jest.It['only'];
testInTransaction.todo = it.todo as jest.It['todo'];
testInTransaction.each = it.each as jest.It['each'];
