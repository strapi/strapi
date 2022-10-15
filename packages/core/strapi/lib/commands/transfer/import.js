'use strict';

const {
  createLocalFileSourceProvider,
  createLocalStrapiDestinationProvider,
  createTransferEngine,
} = require('@strapi/data-transfer');

module.exports = async () => {
  const source = createLocalFileSourceProvider({ backupFilePath: './backup.tar.gz' });

  const destination = createLocalStrapiDestinationProvider({
    getStrapi() {
      return strapi().load();
    },
  });

  const engine = createTransferEngine(source, destination, {
    strategy: 'restore',
    versionMatching: 'ignore',
  });

  await engine.transfer();
};
