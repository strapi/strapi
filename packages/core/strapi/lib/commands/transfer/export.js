'use strict';

const {
  createLocalFileDestinationProvider,
  createLocalStrapiSourceProvider,
  createTransferEngine,
  // TODO: we need to solve this issue with typescript modules
  // eslint-disable-next-line import/no-unresolved, node/no-missing-require
} = require('@strapi/data-transfer');

const strapi = require('../../Strapi');

const getDefaultExportBackupName = () => `strapi-backup`;

const logger = console;

module.exports = async (args, unknownArgs) => {
  /**
   * From local Strapi instance
   */
  const sourceOptions = {
    getStrapi() {
      return strapi().load();
    },
  };
  const source = createLocalStrapiSourceProvider(sourceOptions);

  /**
   * To a Strapi backup file
   */
  // treat any unknown arguments as filenames
  if (unknownArgs.args.length > 1) {
    logger.error('Please enter exactly one filename to export to');
    logger.error(`Received filenames: ${unknownArgs.args.join(', ')}`);
    process.exit(1);
  }
  const outputFile = unknownArgs.args?.[0] || getDefaultExportBackupName();
  console.log('output file', outputFile);
  const BYTES_IN_MB = 1024 * 1024;

  const destinationOptions = {
    file: {
      path: outputFile,
      maxSize: Math.floor(args.maxSize) * BYTES_IN_MB,
      maxSizeJsonl: Math.floor(args.maxSizeJsonl) * BYTES_IN_MB,
    },
    encryption: {
      enabled: args.encrypt,
      key: args.key,
    },
    compression: {
      enabled: args.compress,
    },
  };
  const destination = createLocalFileDestinationProvider(destinationOptions);

  /**
   * Configure and run the transfer engine
   */
  const engineOptions = {
    strategy: args.conflictStrategy,
    versionMatching: args.schemaComparison,
    exclude: args.exclude,
  };
  const engine = createTransferEngine(source, destination, engineOptions);

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
