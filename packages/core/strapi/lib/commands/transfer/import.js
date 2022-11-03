'use strict';

const {
  createLocalFileSourceProvider,
  createLocalStrapiDestinationProvider,
  createTransferEngine,
  // TODO: we need to solve this issue with typescript modules
  // eslint-disable-next-line import/no-unresolved, node/no-missing-require
} = require('@strapi/data-transfer');

const strapi = require('../../Strapi');

const logger = console;

module.exports = async (args, unknownArgs) => {
  if (unknownArgs.args.length !== 1) {
    logger.error('Please enter exactly one filename to import');
    if (unknownArgs.args.length > 1) {
      logger.error(`Received filenames: ${unknownArgs.args.join(', ')}`);
    }
    process.exit(1);
  }

  const inputFile = unknownArgs.args[0];

  // From file
  const sourceOptions = {
    backupFilePath: inputFile,
  };
  const source = createLocalFileSourceProvider(sourceOptions);

  // To Strapi
  const destinationOptions = {
    getStrapi() {
      return strapi().load();
    },
  };
  const destination = createLocalStrapiDestinationProvider(destinationOptions);

  const transferEngineOptions = {
    strategy: args.conflictStrategy,
    versionMatching: args.schemaComparison,
    exclude: args.exclude,
  };
  const engine = createTransferEngine(source, destination, transferEngineOptions);

  try {
    logger.log('Importing data...');
    const result = await engine.transfer();
    logger.log('Import process has been completed successfully!');

    // TODO: this won't dump the entire results, we will print a pretty summary
    logger.log('Results:', result);
    process.exit(0);
  } catch (e) {
    logger.log('Import process failed unexpectedly');
    process.exit(1);
  }
};
