'use strict';

const {
  LocalFileDestinationProvider,
  LocalFileSourceProvider,
  TransferEngine,
} = require('@strapi/data-transfer');

module.exports = async () => {
  const engine = new TransferEngine(
    // From file
    new LocalFileSourceProvider({ backupFilePath: './backup.tar.gz' }),
    // To file
    new LocalFileDestinationProvider({ backupFilePath: 'backup-destination' }),
    {
      strategy: 'restore',
      versionMatching: 'ignore',
    }
  );

  await engine.transfer();
};
