'use strict';

const { createTransferEngine } = require('@strapi/data-transfer/lib/engine');
const {
  providers: {
    createRemoteStrapiDestinationProvider,
    createLocalStrapiSourceProvider,
    createLocalStrapiDestinationProvider,
  },
} = require('@strapi/data-transfer/lib/strapi');
const { isObject } = require('lodash/fp');
const chalk = require('chalk');

const {
  buildTransferTable,
  createStrapiInstance,
  DEFAULT_IGNORED_CONTENT_TYPES,
  formatDiagnostic,
} = require('./utils');

const logger = console;

/**
 * @typedef TransferCommandOptions Options given to the CLI transfer command
 *
 * @property {URL|undefined} [to] The url of a remote Strapi to use as remote destination
 * @property {URL|undefined} [from] The url of a remote Strapi to use as remote source
 * @property {string|undefined} [toToken] The transfer token for the remote destination
 * @property {string|undefined} [fromToken] The transfer token for the remote source
 */

/**
 * Transfer command.
 *
 * Transfers data between local Strapi and remote Strapi instances
 *
 * @param {TransferCommandOptions} opts
 */
module.exports = async (opts) => {
  // Validate inputs from Commander
  if (!isObject(opts)) {
    logger.error('Could not parse command arguments');
    process.exit(1);
  }

  const strapi = await createStrapiInstance();

  let source;
  let destination;

  if (!opts.from && !opts.to) {
    logger.error('At least one source (from) or destination (to) option must be provided');
    process.exit(1);
  }

  // if no URL provided, use local Strapi
  if (!opts.from) {
    source = createLocalStrapiSourceProvider({
      getStrapi: () => strapi,
    });
  }
  // if URL provided, set up a remote source provider
  else {
    logger.error(`Remote Strapi source provider not yet implemented`);
    process.exit(1);
  }

  // if no URL provided, use local Strapi
  if (!opts.to) {
    destination = createLocalStrapiDestinationProvider({
      getStrapi: () => strapi,
    });
  }
  // if URL provided, set up a remote destination provider
  else {
    destination = createRemoteStrapiDestinationProvider({
      url: opts.to,
      auth: {
        type: 'token',
        token: opts.toToken,
      },
      strategy: 'restore',
      restore: {
        entities: { exclude: DEFAULT_IGNORED_CONTENT_TYPES },
      },
    });
  }

  if (!source || !destination) {
    logger.error('Could not create providers');
    process.exit(1);
  }

  const engine = createTransferEngine(source, destination, {
    versionStrategy: 'strict',
    schemaStrategy: 'strict',
    transforms: {
      links: [
        {
          filter(link) {
            return (
              !DEFAULT_IGNORED_CONTENT_TYPES.includes(link.left.type) &&
              !DEFAULT_IGNORED_CONTENT_TYPES.includes(link.right.type)
            );
          },
        },
      ],
      entities: [
        {
          filter(entity) {
            return !DEFAULT_IGNORED_CONTENT_TYPES.includes(entity.type);
          },
        },
      ],
    },
  });

  engine.diagnostics.onDiagnostic(formatDiagnostic('transfer'));

  try {
    logger.log(`Starting transfer...`);

    const results = await engine.transfer();

    const table = buildTransferTable(results.engine);
    logger.log(table.toString());

    logger.log(`${chalk.bold('Transfer process has been completed successfully!')}`);
    process.exit(0);
  } catch (e) {
    logger.error('Transfer process failed.');
    process.exit(1);
  }
};
