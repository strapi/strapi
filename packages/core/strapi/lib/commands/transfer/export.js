'use strict';

// const {
//   createLocalFileDestinationProvider,
//   createLocalStrapiSourceProvider,
//   createTransferEngine,
// } = require('@strapi/data-transfer');
// const strapi = require('../../Strapi');

const getDefaultExportBackupName = () => `strapi-backup`;

module.exports = async (args) => {
  if (!args.output) {
    Object.assign(args, { output: getDefaultExportBackupName() });
  }

  // // From strapi
  // const source = createLocalStrapiSourceProvider({
  //   getStrapi() {
  //     return strapi().load();
  //   },
  // });

  // // To file
  // const destination = createLocalFileDestinationProvider({
  //   backupFilePath: args.output,
  // });

  // // create transfer engine
  // const engine = createTransferEngine(source, destination, {
  //   strategy: 'restore',
  //   versionMatching: 'minor',
  // });

  // await engine.transfer();

  const { success, path } = { success: false, path: null };

  if (success) {
    console.log('Export process has been completed successfully! Export archive is in %s', path);
    process.exit(0);
  }

  console.error('Export process failed unexpectedly');
  process.exit(1);
};
