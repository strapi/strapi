'use strict';

const {
  createLocalFileSourceProvider,
  createLocalStrapiDestinationProvider,
  createTransferEngine,
} = require('@strapi/data-transfer');

module.exports = async () => {
  console.log('Importing data...');

  // From file
  const source = createLocalFileSourceProvider({ backupFilePath: './backup.tar.gz' });

  // To Strapi
  const destination = createLocalStrapiDestinationProvider({
    getStrapi() {
      return strapi().load();
    },
  });

  const engine = createTransferEngine(source, destination, {
    strategy: 'restore',
    versionMatching: 'ignore',
  });

  try {
    const result = await engine.transfer();
    console.log('Import process has been completed successfully!');

    // TODO: this won't dump the entire results, we will print a pretty summary
    console.log('Results:', result);
    process.exit(0);
  } catch (e) {
    console.log('Import process failed unexpectedly');
    process.exit(1);
  }
};
