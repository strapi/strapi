import * as dataTransfer from '@strapi/data-transfer';

import { isObject } from 'lodash/fp';

import {
  buildTransferTable,
  DEFAULT_IGNORED_CONTENT_TYPES,
  createStrapiInstance,
  formatDiagnostic,
  loadersFactory,
  exitMessageText,
  abortTransfer,
  getTransferTelemetryPayload,
  setSignalHandler,
  getDiffHandler,
} from '../../utils/data-transfer';
import { exitWith } from '../../utils/helpers';

const {
  file: {
    providers: { createLocalFileSourceProvider },
  },
  strapi: {
    providers: { createLocalStrapiDestinationProvider, DEFAULT_CONFLICT_STRATEGY },
  },
  engine: { createTransferEngine, DEFAULT_VERSION_STRATEGY, DEFAULT_SCHEMA_STRATEGY },
} = dataTransfer;

interface CmdOptions {
  file?: string;
  decompress?: boolean;
  decrypt?: boolean;
  key?: string;
  conflictStrategy?: 'restore';
  versionStrategy?: EngineOptions['versionStrategy'];
  schemaStrategy?: EngineOptions['schemaStrategy'];
  force?: boolean;
  only?: (keyof dataTransfer.engine.TransferGroupFilter)[];
  exclude?: (keyof dataTransfer.engine.TransferGroupFilter)[];
  throttle?: number;
}

type EngineOptions = Parameters<typeof createTransferEngine>[2];

/**
 * Import command.
 *
 * It transfers data from a file to a local Strapi instance
 */
export default async (opts: CmdOptions) => {
  // validate inputs from Commander
  if (!isObject(opts)) {
    exitWith(1, 'Could not parse arguments');
  }

  /**
   * From strapi backup file
   */
  const sourceOptions = getLocalFileSourceOptions(opts);

  const source = createLocalFileSourceProvider(sourceOptions);

  /**
   * To local Strapi instance
   */
  const strapiInstance = await createStrapiInstance();

  const destinationOptions = {
    async getStrapi() {
      return strapiInstance;
    },
    autoDestroy: false,
    strategy: opts.conflictStrategy || DEFAULT_CONFLICT_STRATEGY,
    restore: {
      entities: { exclude: DEFAULT_IGNORED_CONTENT_TYPES },
    },
  };
  const destination = createLocalStrapiDestinationProvider(destinationOptions);

  /**
   * Configure and run the transfer engine
   */
  const engineOptions: EngineOptions = {
    versionStrategy: opts.versionStrategy || DEFAULT_VERSION_STRATEGY,
    schemaStrategy: opts.schemaStrategy || DEFAULT_SCHEMA_STRATEGY,
    exclude: opts.exclude ?? [],
    only: opts.only ?? [],
    throttle: opts.throttle ?? 0,
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
          filter: (entity) => !DEFAULT_IGNORED_CONTENT_TYPES.includes(entity.type),
        },
      ],
    },
  };

  const engine = createTransferEngine(source, destination, engineOptions);

  engine.diagnostics.onDiagnostic(formatDiagnostic('import'));

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

  let results: Awaited<ReturnType<typeof engine.transfer>>;
  try {
    // Abort transfer if user interrupts process
    setSignalHandler(() => abortTransfer({ engine, strapi }));

    results = await engine.transfer();

    try {
      const table = buildTransferTable(results.engine);
      console.log(table.toString());
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
  const options: dataTransfer.file.providers.ILocalFileSourceProviderOptions = {
    file: { path: opts.file ?? '' },
    compression: { enabled: !!opts.decompress },
    encryption: { enabled: !!opts.decrypt, key: opts.key },
  };

  return options;
};
