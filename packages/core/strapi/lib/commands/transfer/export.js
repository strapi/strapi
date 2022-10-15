'use strict';

const {
  LocalFileDestinationProvider,
  LocalStrapiSourceProvider,
  TransferEngine,
} = require('@strapi/data-transfer');
const strapi = require('../../Strapi');

const getDefaultExportBackupName = () => `strapi-backup`;

module.exports = async (args) => {
  if (!args.output) {
    Object.assign(args, { output: getDefaultExportBackupName() });
  }

  const engine = new TransferEngine(
    // From strapi
    new LocalStrapiSourceProvider({
      createStrapiInstance() {
        return strapi().load();
      },
    }),
    // To file
    new LocalFileDestinationProvider({
      backupFilePath: args.output,
    }),
    {
      strategy: 'restore',
      versionMatching: 'minor',
    }
  );

  await engine.transfer();
};
