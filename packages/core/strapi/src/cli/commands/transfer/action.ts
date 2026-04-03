import { isObject } from 'lodash/fp';
import ora from 'ora';
import type { Ora } from 'ora';
import { engine as engineDataTransfer, strapi as strapiDataTransfer } from '@strapi/data-transfer';

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
} from '../../utils/data-transfer';
import {
  exitWith,
  formatElapsedAndMaybeRemainingLabel,
  TRANSFER_PROGRESS_FIELD_SEP,
} from '../../utils/helpers';

const { createTransferEngine } = engineDataTransfer;
const {
  providers: {
    createRemoteStrapiDestinationProvider,
    createLocalStrapiSourceProvider,
    createLocalStrapiDestinationProvider,
    createRemoteStrapiSourceProvider,
  },
} = strapiDataTransfer;

type LocalStrapiDestinationOptions = Parameters<typeof createLocalStrapiDestinationProvider>[0];
type RemoteStrapiDestinationOptions = Parameters<typeof createRemoteStrapiDestinationProvider>[0];

const resolveRemotePullAssetIdleTimeoutMs = (value: unknown): number | undefined => {
  if (value == null || value === '') {
    return undefined;
  }
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    return undefined;
  }
  return n;
};

interface CmdOptions {
  from?: URL;
  fromToken: string;
  to: URL;
  toToken: string;
  verbose?: boolean;
  only?: (keyof engineDataTransfer.TransferGroupFilter)[];
  exclude?: (keyof engineDataTransfer.TransferGroupFilter)[];
  throttle?: number;
  force?: boolean;
  checksums?: boolean;
}
/**
 * Transfer command.
 *
 * Transfers data between local Strapi and remote Strapi instances
 */
export default async (opts: CmdOptions) => {
  // Avoid DeprecationWarning lines on stderr (e.g. pg `client.query()` while a query is in flight)
  // interleaving with ora spinners during transfer. (Runtime API; not on all @types/node Process typings.)
  (process as NodeJS.Process & { noDeprecation: boolean }).noDeprecation = true;

  // Validate inputs from Commander
  if (!isObject(opts)) {
    exitWith(1, 'Could not parse command arguments');
  }

  if (!(opts.from || opts.to) || (opts.from && opts.to)) {
    exitWith(1, 'Exactly one source (from) or destination (to) option must be provided');
  }

  const strapi = await createStrapiInstance();
  const checksumsEnabled = opts.checksums !== false;
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

    const assetIdleTimeoutMs = resolveRemotePullAssetIdleTimeoutMs(
      strapi.config.get('server.transfer.remote.assetIdleTimeoutMs')
    );

    source = createRemoteStrapiSourceProvider({
      getStrapi: () => strapi,
      url: opts.from,
      auth: {
        type: 'token',
        token: opts.fromToken,
      },
      ...(assetIdleTimeoutMs !== undefined ? { streamTimeout: assetIdleTimeoutMs } : {}),
      ...(checksumsEnabled ? { verifyChecksums: true } : {}),
    });
  }

  /** Wired after `engine` exists so destination prep can update the CLI spinner. */
  const transferPhaseBridge: { emit: (message: string) => void } = {
    emit() {
      /* replaced below once `progress` exists */
    },
  };

  // if no URL provided, use local Strapi
  if (!opts.to) {
    destination = createLocalStrapiDestinationProvider({
      getStrapi: () => strapi,
      strategy: 'restore',
      restore: parseRestoreFromOptions(opts),
      onTransferPhase: (message: string) => transferPhaseBridge.emit(message),
    } satisfies LocalStrapiDestinationOptions);
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
      onTransferPhase: (message: string) => transferPhaseBridge.emit(message),
      ...(checksumsEnabled ? { verifyChecksums: true } : {}),
    } satisfies RemoteStrapiDestinationOptions);
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

  /** Shown until destination prep emits a step; then we keep this prefix and append the step after " — ". */
  const STARTING_TRANSFER_PREFIX = 'Starting transfer…';
  let prepStepDetail: string | null = null;

  const formatPrepSpinnerLine = () =>
    prepStepDetail != null && prepStepDetail !== ''
      ? `${STARTING_TRANSFER_PREFIX} — ${prepStepDetail}`
      : STARTING_TRANSFER_PREFIX;

  transferPhaseBridge.emit = (message: string) => {
    prepStepDetail = message;
    progress.emit('transfer::phase', { message: formatPrepSpinnerLine() });
  };

  const { updateLoader } = loadersFactory();

  let startingSpinner: Ora | null = null;
  let startingElapsedInterval: ReturnType<typeof setInterval> | null = null;
  /** Set when `transfer::start` fires so we can print a final persisted line with elapsed time. */
  let transferPrepStartedAt: number | null = null;

  /**
   * Stops the "starting transfer" spinner and **leaves a finished line** in the console (like stage
   * `succeed`/`fail`), so the next stage spinner starts on a new line instead of replacing this one.
   */
  const finishStartingSpinner = (outcome: 'done' | 'fail' = 'done') => {
    if (startingElapsedInterval) {
      clearInterval(startingElapsedInterval);
      startingElapsedInterval = null;
    }
    if (startingSpinner) {
      const elapsed = transferPrepStartedAt != null ? Date.now() - transferPrepStartedAt : 0;
      const line = `${formatPrepSpinnerLine()}${TRANSFER_PROGRESS_FIELD_SEP}${formatElapsedAndMaybeRemainingLabel(
        elapsed,
        null
      )}`;
      if (outcome === 'fail') {
        startingSpinner.fail(line);
      } else {
        startingSpinner.succeed(line);
      }
      startingSpinner = null;
      transferPrepStartedAt = null;
    }
  };

  engine.onSchemaDiff(getDiffHandler(engine, { force: opts.force, action: 'transfer' }));

  engine.addErrorHandler(
    'ASSETS_DIRECTORY_ERR',
    getAssetsBackupHandler(engine, { force: opts.force, action: 'transfer' })
  );

  // Update more frequently to ensure elapsed time is accurate even if the stage is not progressing
  const activeStages = new Set<string>();
  const lastStageData: Record<string, any> = {};
  const interval = setInterval(() => {
    for (const stage of activeStages) {
      if (lastStageData[stage]) {
        // Clone the lastStageData and ensure endTime is undefined so elapsed uses Date.now()
        const dataCopy = { ...lastStageData[stage], endTime: undefined };
        updateLoader(stage as any, { [stage]: dataCopy });
      }
    }
  }, 100);

  progress.on(`stage::start`, ({ stage, data }) => {
    finishStartingSpinner('done');
    updateLoader(stage, data).start();
  });

  progress.on('stage::finish', ({ stage, data }) => {
    updateLoader(stage, data).succeed();
  });

  progress.on('stage::progress', ({ stage, data }) => {
    lastStageData[stage] = data[stage];
    activeStages.add(stage);
    updateLoader(stage, data);
  });

  progress.on('stage::error', ({ stage, data }) => {
    updateLoader(stage, data).fail();
  });

  progress.on('transfer::finish', () => {
    finishStartingSpinner('done');
    clearInterval(interval);
  });
  progress.on('transfer::error', () => {
    finishStartingSpinner('fail');
    clearInterval(interval);
  });

  progress.on('transfer::start', async () => {
    transferPrepStartedAt = Date.now();
    prepStepDetail = null;
    startingSpinner = ora(formatPrepSpinnerLine()).start();
    startingElapsedInterval = setInterval(() => {
      if (startingSpinner && transferPrepStartedAt != null) {
        const elapsed = Date.now() - transferPrepStartedAt;
        startingSpinner.text = `${formatPrepSpinnerLine()}${TRANSFER_PROGRESS_FIELD_SEP}${formatElapsedAndMaybeRemainingLabel(
          elapsed,
          null
        )}`;
      }
    }, 100);

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
