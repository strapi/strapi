import { resetDatabaseAndImportDataFromPath } from '../dts-import';

const importData = async () => {
  const args = process.argv.slice(2);
  const filePath = args[0];

  if (!filePath) {
    console.error('Please provide the name of the file you want to import from tests/e2e/data');
    process.exit(1);
  }

  await resetDatabaseAndImportDataFromPath(filePath);
  console.log('Data transfer succeeded');
  process.exit(0);
};

// Only execute if this file is run directly as a script with a file path argument
// This prevents execution when the module is imported/required (e.g., by Jest)
// Don't execute if we're in a test environment or being imported
const isTestEnvironment =
  process.env.NODE_ENV === 'test' ||
  process.env.JEST_WORKER_ID !== undefined ||
  typeof jest !== 'undefined';

const isDirectExecution =
  !isTestEnvironment &&
  typeof require.main !== 'undefined' &&
  require.main === module &&
  process.argv.length > 2 &&
  process.argv[2];

if (isDirectExecution) {
  importData();
}

// Export the function for use as a module
module.exports = { resetDatabaseAndImportDataFromPath };
