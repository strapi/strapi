'use strict';

const {
  createLocalFileDestinationProvider,
  createLocalStrapiSourceProvider,
  createTransferEngine,
  // TODO: we need to solve this issue with typescript modules
  // eslint-disable-next-line import/no-unresolved, node/no-missing-require
} = require('@strapi/data-transfer');
const strapi = require('../../Strapi');
const { getDefaultExportBackupName } = require('./utils');

const logger = console;

module.exports = async (args) => {
  // From strapi
  const inputOptions = {
    getStrapi() {
      return strapi().load();
    },
  };
  const source = createLocalStrapiSourceProvider(inputOptions);

  // To file
  const outputOptions = {
    file: {
      path: args.output ?? getDefaultExportBackupName(),
    },
    encryption: {
      enabled: args.encrypt,
      key: args.key,
    },
    compression: {
      enabled: args.compress,
    },
  };
  const destination = createLocalFileDestinationProvider(outputOptions);
  console.log('outputoptions', outputOptions);
  // create transfer engine
  const engine = createTransferEngine(source, destination, {
    strategy: 'restore',
    versionMatching: 'minor',
  });

  try {
    const result = await engine.transfer();

    if (!result?.destination?.path) throw new Error('Export file not created');
    logger.log(
      'Export process has been completed successfully! Export archive is in %s',
      result.destination.path
    );
    process.exit(0);
  } catch (e) {
    logger.error('Export process failed unexpectedly:', e.toString());
    process.exit(1);
  }
};
