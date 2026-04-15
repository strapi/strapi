import type { Core } from '@strapi/types';
import { isObject } from 'lodash/fp';
import chalk from 'chalk';

import fs from 'fs-extra';

import {
  engine as engineDataTransfer,
  strapi as strapiDataTransfer,
  file as fileDataTransfer,
  directory as directoryDataTransfer,
} from '@strapi/data-transfer';

import {
  buildTransferTable,
  isIgnoredContentType,
  createStrapiInstance,
  formatDiagnostic,
  loadersFactory,
  exitMessageText,
  abortTransfer,
  getTransferTelemetryPayload,
  setSignalHandler,
  getDiffHandler,
  parseRestoreFromOptions,
} from '../../utils/data-transfer';
import { exitWith } from '../../utils/helpers';

const {
  providers: { createLocalFileSourceProvider },
} = fileDataTransfer;

const {
  providers: { createLocalDirectorySourceProvider },
} = directoryDataTransfer;

const {
  providers: { createLocalStrapiDestinationProvider, DEFAULT_CONFLICT_STRATEGY },
} = strapiDataTransfer;

const { createTransferEngine, DEFAULT_VERSION_STRATEGY, DEFAULT_SCHEMA_STRATEGY } =
  engineDataTransfer;

interface CmdOptions {
  file?: string;
  decompress?: boolean;
  decrypt?: boolean;
  verbose?: boolean;
  key?: string;
  conflictStrategy?: 'restore';
  force?: boolean;
  only?: (keyof engineDataTransfer.TransferGroupFilter)[];
  exclude?: (keyof engineDataTransfer.TransferGroupFilter)[];
  throttle?: number;
}

type EngineOptions = Parameters<typeof createTransferEngine>[2];

/**
 * Import command.
 *
 * It transfers data from a Strapi backup file or unpacked export directory to a local Strapi instance
 */
export default async (opts: CmdOptions) => {
  // validate inputs from Commander
  if (!isObject(opts)) {
    exitWith(1, 'Could not parse arguments');
  }

  const backupPath = opts.file ?? '';
  const source = (await fs.stat(backupPath)).isDirectory()
    ? createLocalDirectorySourceProvider({ directory: { path: backupPath } })
    : createLocalFileSourceProvider(getLocalFileSourceOptions(opts));

  /**
   * To local Strapi instance
   */
  const strapiInstance = await createStrapiInstance();

  /**
   * Configure and run the transfer engine
   */
  const engineOptions: EngineOptions = {
    versionStrategy: DEFAULT_VERSION_STRATEGY,
    schemaStrategy: DEFAULT_SCHEMA_STRATEGY,
    exclude: opts.exclude,
    only: opts.only,
    throttle: opts.throttle,
    transforms: {
      links: [
        {
          filter(link) {
            return !isIgnoredContentType(link.left.type) && !isIgnoredContentType(link.right.type);
          },
        },
      ],
      entities: [
        {
          filter: (entity) => !isIgnoredContentType(entity.type),
        },
      ],
    },
  };

  const destinationOptions = {
    async getStrapi() {
      return strapiInstance;
    },
    autoDestroy: false,
    strategy: opts.conflictStrategy || DEFAULT_CONFLICT_STRATEGY,
    restore: parseRestoreFromOptions(engineOptions, strapiInstance),
  };

  const destination = createLocalStrapiDestinationProvider(destinationOptions);
  destination.onWarning = (message) => console.warn(`\n${chalk.yellow('warn')}: ${message}`);

  const engine = createTransferEngine(source, destination, engineOptions);

  engine.diagnostics.onDiagnostic(formatDiagnostic('import', opts.verbose));

  const progress = engine.progress.stream;

  const { updateLoader } = loadersFactory();

  engine.onSchemaDiff(getDiffHandler(engine, { force: opts.force, action: 'import' }));

  progress.on(`stage::start`, ({ stage, data }) => {
    updateLoader(stage, data).start();
  });

  progress.on('stage::finish', ({ stage, data }) => {
    updateLoader(stage, data).succeed();
  });

  progress.on('stage::progress', ({ stage, data }) => {
    updateLoader(stage, data);
  });

  progress.on('transfer::start', async () => {
    console.log('Starting import...');
    await strapiInstance.telemetry.send(
      'didDEITSProcessStart',
      getTransferTelemetryPayload(engine)
    );
  });

  let results: engineDataTransfer.ITransferResults<typeof source, typeof destination>;
  try {
    // Abort transfer if user interrupts process
    setSignalHandler(() => abortTransfer({ engine, strapi: strapi as Core.Strapi }));

    results = await engine.transfer();

    try {
      const table = buildTransferTable(results.engine);
      console.log(table?.toString());
    } catch (e) {
      console.error('There was an error displaying the results of the transfer.');
    }

    // Note: we need to await telemetry or else the process ends before it is sent
    await strapiInstance.telemetry.send(
      'didDEITSProcessFinish',
      getTransferTelemetryPayload(engine)
    );
    await strapiInstance.destroy();

    exitWith(0, exitMessageText('import'));
  } catch (e) {
    await strapiInstance.telemetry.send('didDEITSProcessFail', getTransferTelemetryPayload(engine));
    exitWith(1, exitMessageText('import', true));
  }
};

/**
 * Infer local file source provider options based on a given filename
 */
const getLocalFileSourceOptions = (opts: {
  file?: string;
  decompress?: boolean;
  decrypt?: boolean;
  key?: string;
}) => {
  const options: fileDataTransfer.providers.ILocalFileSourceProviderOptions = {
    file: { path: opts.file ?? '' },
    compression: { enabled: !!opts.decompress },
    encryption: { enabled: !!opts.decrypt, key: opts.key },
  };

  return options;
};
