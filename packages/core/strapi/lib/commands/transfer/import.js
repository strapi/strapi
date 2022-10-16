'use strict';

// const {
//   createLocalFileSourceProvider,
//   createLocalStrapiDestinationProvider,
//   createTransferEngine,
// } = require('@strapi/data-transfer');

module.exports = async () => {
  console.log('Importing data...');
  // const source = createLocalFileSourceProvider({ backupFilePath: './backup.tar.gz' });

  // const destination = createLocalStrapiDestinationProvider({
  //   getStrapi() {
  //     return strapi().load();
  //   },
  // });

  // const engine = createTransferEngine(source, destination, {
  //   strategy: 'restore',
  //   versionMatching: 'ignore',
  // });

  // await engine.transfer();
  const { success } = { success: false };

  if (success) {
    console.log('Import process has been completed successfully!');
    process.exit(0);
  }

  console.log('Import process failed unexpectedly');
  process.exit(1);
};
