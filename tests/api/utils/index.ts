import profile from 'api-tests/profile';

/* -------------------------------------------------------------------------------------------------
 * setupDatabaseReset
 * -----------------------------------------------------------------------------------------------*/

// Store initial database state for reset
let initialTestData = {};
let isTestDataCaptured = false;
let allTableNames = [];

/**
 * Tables that SQL run since the last reset may have written to.
 *
 * Every query knex runs, in a transaction or not, emits a `query` event, and a write names its
 * table right after its verb. A statement that is neither a read nor a write whose table this
 * can read marks every table dirty, so SQL this does not understand costs a full reset, not a
 * leak into the next test.
 */
const READ_ONLY_STATEMENT =
  /^\s*(select|pragma|begin|commit|rollback|savepoint|release|show|explain)\b/i;
const WRITE_STATEMENT =
  /^\s*(?:insert(?:\s+or\s+\w+)?\s+into|update|delete\s+from|replace\s+into)\s+(?:[`"]?\w+[`"]?\.)?[`"]?(\w+)[`"]?/i;

const dirtyTables = new Set<string>();
let everyTableDirty = false;

const trackWrites = ({ sql }: { sql?: unknown }) => {
  if (typeof sql !== 'string' || READ_ONLY_STATEMENT.test(sql)) {
    return;
  }

  const match = WRITE_STATEMENT.exec(sql);

  if (match) {
    dirtyTables.add(match[1]);
  } else {
    everyTableDirty = true;
  }
};

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

  strapi.db.connection.on('query', trackWrites);
  isTestDataCaptured = true;
}

/**
 * mysql2 parses JSON columns into arrays and objects. Knex then renders a JS
 * array as an empty SQL slot (`values (, ...)`), so the INSERT is rejected
 * after the table was cleared. Postgres and SQLite accept those values.
 */
const rowsForMysqlInsert = (rows: Record<string, unknown>[]) =>
  rows.map((row) => {
    const copy: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(row)) {
      const isJson =
        Array.isArray(value) ||
        (typeof value === 'object' &&
          value !== null &&
          !(value instanceof Date) &&
          !Buffer.isBuffer(value));

      copy[key] = isJson ? JSON.stringify(value) : value;
    }

    return copy;
  });

/**
 * Restores the tables written to since the last reset. Restoring every table took about 1.4 s
 * on SQLite, most of it re-inserting rows no test had touched.
 */
async function resetTestDatabase() {
  const tablesToReset = everyTableDirty
    ? allTableNames
    : allTableNames.filter((tableName) => dirtyTables.has(tableName));

  if (tablesToReset.length === 0) {
    return;
  }

  // Use Strapi's built-in schema update mechanism to disable constraints (e.g. foreign key constraints)
  await strapi.db.dialect.startSchemaUpdate();
  const client = strapi.db.connection.client.config.client;
  const isMysql = client === 'mysql' || client === 'mysql2';

  try {
    for (const tableName of tablesToReset) {
      try {
        // Clear the table
        await strapi.db.connection(tableName).del();

        // Restore initial data if any
        const initialData = initialTestData[tableName];
        if (initialData && initialData.length > 0) {
          const rows = isMysql ? rowsForMysqlInsert(initialData) : initialData;
          await strapi.db.connection(tableName).insert(rows);
        }
      } catch (error) {
        console.warn(`Could not reset table ${tableName}:`, error.message);
      }
    }
  } finally {
    // Always re-enable constraints
    await strapi.db.dialect.endSchemaUpdate();
    // The reset's own writes leave every table as captured.
    dirtyTables.clear();
    everyTableDirty = false;
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
      await profile.timed('reset.capture', () => captureInitialTestData());
      isDataCaptured = true;
    }
  });

  afterEach(async () => {
    if (isDataCaptured) {
      await profile.timed('reset.restore', () => resetTestDatabase());
    }
  });
}

/* -------------------------------------------------------------------------------------------------
 * testInTransaction
 * -----------------------------------------------------------------------------------------------*/

/**
 * Thrown at the end of a successful test to force the Strapi `transaction` catch path
 * (single `rollback()`) and avoid a second `commit()` on an already-rolled-back Knex
 * transactor. See `test-in-transaction-strapi-db.md`.
 */
const testInTransactionRollback = Symbol('testInTransaction.rollback');

export const wrapInTransaction = (test) => {
  return async (...args) => {
    try {
      await strapi.db.transaction(async ({ trx }) => {
        await test(trx, ...args);
        // Do not `await rollback()` and return: Strapi's transaction() always calls
        // `commit()` on successful return, which double-finalises the transactor
        // (hang / "Transaction query already complete").
        throw testInTransactionRollback;
      });
    } catch (e) {
      if (e === testInTransactionRollback) {
        return;
      }
      throw e;
    }
  };
};

/**
 * Resets the database by rolling back a transaction after each test.
 *
 * See `test-in-transaction-strapi-db.md` for how this interacts with `strapi.db.transaction`.
 *
 * NOTE: Alternatively, use `setupDatabaseReset()` which is slower but avoids async work
 * that runs after the test's transaction context has closed.
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
