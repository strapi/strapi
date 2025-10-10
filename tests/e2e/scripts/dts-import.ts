import { resetDatabaseAndImportDataFromPath } from '../utils/dts-import';

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

importData();
