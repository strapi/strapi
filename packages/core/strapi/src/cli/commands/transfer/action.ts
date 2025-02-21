import { isObject, isString } from 'lodash/fp';
import {
  engine as engineDataTransfer,
  strapi as strapiDataTransfer,
  file as fileDataTransfer,
} from '@strapi/data-transfer';

import {
  buildTransferTable,
  createStrapiInstance,
  DEFAULT_IGNORED_CONTENT_TYPES,
  formatDiagnostic,
  loadersFactory,
  exitMessageText,
  abortTransfer,
  getTransferTelemetryPayload,
  setSignalHandler,
  getDiffHandler,
  getAssetsBackupHandler,
  parseRestoreFromOptions,
  getDefaultExportName,
} from '../../utils/data-transfer';
import { exitWith } from '../../utils/helpers';

const { createTransferEngine } = engineDataTransfer;
const {
  providers: {
    createRemoteStrapiDestinationProvider,
    createLocalStrapiSourceProvider,
    createLocalStrapiDestinationProvider,
    createRemoteStrapiSourceProvider,
  },
} = strapiDataTransfer;

const {
  providers: { createLocalFileDestinationProvider, createLocalFileSourceProvider },
} = fileDataTransfer;

interface CmdOptions {
  from?: URL;
  fromToken: string;
  to: URL;
  toToken: string;
  toFile?: string;
  toKey?: string;
  toEncrypt?: boolean;
  toCompress?: boolean;
  fromFile?: string;
  fromKey?: string;
  fromEncrypt?: boolean;
  fromCompress?: boolean;
  verbose?: boolean;
  only?: (keyof engineDataTransfer.TransferGroupFilter)[];
  exclude?: (keyof engineDataTransfer.TransferGroupFilter)[];
  throttle?: number;
  force?: boolean;
  experimental?: boolean;
}
/**
 * Transfer command.
 *
 * Transfers data between local Strapi and remote Strapi instances
 */
export default async (opts: CmdOptions) => {
  // Validate inputs from Commander
  if (!isObject(opts)) {
    exitWith(1, 'Could not parse command arguments');
  }

  if (!opts.experimental) {
    if (!(opts.from || opts.to) || (opts.from && opts.to)) {
      exitWith(1, 'Exactly one source (from) or destination (to) option must be provided');
    }
  }

  const strapi = await createStrapiInstance();
  let source;
  let destination;

  // create the source provider based on the options
  if (!opts.from) {
    if (opts.fromFile) {
      source = createFileSourceProvider(opts);
    } else {
      source = createLocalStrapiSourceProvider({
        getStrapi: () => strapi,
      });
    }
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

  // create the destination provider based on the options
  if (!opts.to) {
    if (opts.toFile) {
      destination = createFileDestinationProvider(opts);
    } else {
      destination = createLocalStrapiDestinationProvider({
        getStrapi: () => strapi,
        strategy: 'restore',
        restore: parseRestoreFromOptions(opts),
      });
    }
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
      restore: parseRestoreFromOptions(opts),
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

  engine.diagnostics.onDiagnostic(formatDiagnostic('transfer', opts.verbose));

  const progress = engine.progress.stream;

  const { updateLoader } = loadersFactory();

  engine.onSchemaDiff(getDiffHandler(engine, { force: opts.force, action: 'transfer' }));

  engine.addErrorHandler(
    'ASSETS_DIRECTORY_ERR',
    getAssetsBackupHandler(engine, { force: opts.force, action: 'transfer' })
  );

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

  progress.on('transfer::start', async () => {
    console.log(`Starting transfer...`);

    await strapi.telemetry.send('didDEITSProcessStart', getTransferTelemetryPayload(engine));
  });

  let results: Awaited<ReturnType<typeof engine.transfer>>;
  try {
    // Abort transfer if user interrupts process
    setSignalHandler(() => abortTransfer({ engine, strapi }));

    results = await engine.transfer();

    // Note: we need to await telemetry or else the process ends before it is sent
    await strapi.telemetry.send('didDEITSProcessFinish', getTransferTelemetryPayload(engine));

    try {
      const table = buildTransferTable(results.engine);
      console.log(table?.toString());
    } catch (e) {
      console.error('There was an error displaying the results of the transfer.');
    }

    exitWith(0, exitMessageText('transfer'));
  } catch (e) {
    await strapi.telemetry.send('didDEITSProcessFail', getTransferTelemetryPayload(engine));
    exitWith(1, exitMessageText('transfer', true));
  }
};

const createFileDestinationProvider = (opts: CmdOptions) => {
  const { toFile, toEncrypt, toCompress, toKey } = opts;
  const filepath = isString(toFile) && toFile.length > 0 ? toFile : getDefaultExportName();

  return createLocalFileDestinationProvider({
    file: {
      path: filepath ?? getDefaultExportName(),
    },
    encryption: {
      enabled: toEncrypt ?? false,
      key: toKey,
    },
    compression: {
      enabled: toCompress ?? false,
    },
  });
};

const createFileSourceProvider = (opts: CmdOptions) => {
  const { fromFile, fromEncrypt, fromCompress, fromKey } = opts;

  if (!fromFile) {
    throw new Error('Missing file to import');
  }

  return createLocalFileSourceProvider({
    file: {
      path: fromFile,
    },
    encryption: {
      enabled: fromEncrypt ?? false,
      key: fromKey,
    },
    compression: {
      enabled: fromCompress ?? false,
    },
  });
};
