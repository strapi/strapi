'use strict';

const {
  engine: { createTransferEngine },
  strapi: {
    providers: {
      createRemoteStrapiDestinationProvider,
      createLocalStrapiSourceProvider,
      createLocalStrapiDestinationProvider,
      createRemoteStrapiSourceProvider,
    },
  },
} = require('@strapi/data-transfer');
const { isObject } = require('lodash/fp');

const {
  buildTransferTable,
  createStrapiInstance,
  DEFAULT_IGNORED_CONTENT_TYPES,
  formatDiagnostic,
  loadersFactory,
  exitMessageText,
  abortTransfer,
} = require('./utils');
const { exitWith } = require('../utils/helpers');

/**
 * @typedef TransferCommandOptions Options given to the CLI transfer command
 *
 * @property {URL|undefined} [to] The url of a remote Strapi to use as remote destination
 * @property {URL|undefined} [from] The url of a remote Strapi to use as remote source
 * @property {string|undefined} [toToken] The transfer token for the remote Strapi destination
 * @property {string|undefined} [fromToken] The transfer token for the remote Strapi source
 * @property {(keyof import('@strapi/data-transfer/src/engine').TransferGroupFilter)[]} [only] If present, only include these filtered groups of data
 * @property {(keyof import('@strapi/data-transfer/src/engine').TransferGroupFilter)[]} [exclude] If present, exclude these filtered groups of data
 * @property {number|undefined} [throttle] Delay in ms after each record
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
    exitWith(1, 'Could not parse command arguments');
  }

  if (!(opts.from || opts.to) || (opts.from && opts.to)) {
    exitWith(1, 'Exactly one source (from) or destination (to) option must be provided');
  }

  const strapi = await createStrapiInstance();
  let source;
  let destination;

  // if no URL provided, use local Strapi
  if (!opts.from) {
    source = createLocalStrapiSourceProvider({
      getStrapi: () => strapi,
    });
  }
  // if URL provided, set up a remote source provider
  else {
    if (!opts.fromToken) {
      exitWith(1, 'Missing token for remote destination');
    }

    source = createRemoteStrapiSourceProvider({
      getStrapi: () => strapi,
      url: opts.from,
      auth: {
        type: 'token',
        token: opts.fromToken,
      },
    });
  }

  // if no URL provided, use local Strapi
  if (!opts.to) {
    destination = createLocalStrapiDestinationProvider({
      getStrapi: () => strapi,
      strategy: 'restore',
      restore: {
        entities: { exclude: DEFAULT_IGNORED_CONTENT_TYPES },
      },
    });
  }
  // if URL provided, set up a remote destination provider
  else {
    if (!opts.toToken) {
      exitWith(1, 'Missing token for remote destination');
    }

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
    exitWith(1, 'Could not create providers');
  }

  const engine = createTransferEngine(source, destination, {
    versionStrategy: 'exact',
    schemaStrategy: 'strict',
    exclude: opts.exclude,
    only: opts.only,
    throttle: opts.throttle,
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

  const progress = engine.progress.stream;

  const { updateLoader } = loadersFactory();

  progress.on(`stage::start`, ({ stage, data }) => {
    updateLoader(stage, data).start();
  });

  progress.on('stage::finish', ({ stage, data }) => {
    updateLoader(stage, data).succeed();
  });

  progress.on('stage::progress', ({ stage, data }) => {
    updateLoader(stage, data);
  });

  progress.on('stage::error', ({ stage, data }) => {
    updateLoader(stage, data).fail();
  });

  let results;
  try {
    console.log(`Starting transfer...`);

    // Abort transfer if user interrupts process
    ['SIGTERM', 'SIGINT', 'SIGQUIT'].forEach((signal) => {
      process.removeAllListeners(signal);
      process.on(signal, () => abortTransfer({ engine, strapi }));
    });

    results = await engine.transfer();
  } catch (e) {
    exitWith(1, exitMessageText('transfer', true));
  }

  const table = buildTransferTable(results.engine);
  console.log(table.toString());
  exitWith(0, exitMessageText('transfer'));
};
