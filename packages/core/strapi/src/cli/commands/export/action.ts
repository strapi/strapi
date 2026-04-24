import path from 'path';
import { isObject, isString, isFinite, toNumber } from 'lodash/fp';
import fs from 'fs-extra';
import chalk from 'chalk';
import type { Core } from '@strapi/types';

import {
  engine as engineDataTransfer,
  strapi as strapiDataTransfer,
  file as fileDataTransfer,
  directory as directoryDataTransfer,
} from '@strapi/data-transfer';

import {
  getDefaultExportName,
  buildTransferTable,
  isIgnoredContentType,
  createStrapiInstance,
  formatDiagnostic,
  loadersFactory,
  exitMessageText,
  abortTransfer,
  getTransferTelemetryPayload,
  setSignalHandler,
} from '../../utils/data-transfer';
import { exitWith } from '../../utils/helpers';
import { normalizeExportDirFormatOpts } from './validate-dir-format';

const {
  providers: { createLocalFileDestinationProvider },
} = fileDataTransfer;

const {
  providers: { createLocalDirectoryDestinationProvider },
} = directoryDataTransfer;
const {
  providers: { createLocalStrapiSourceProvider },
} = strapiDataTransfer;

const BYTES_IN_MB = 1024 * 1024;

interface CmdOptions {
  file?: string;
  /** @default 'tar' */
  format?: 'tar' | 'dir';
  encrypt?: boolean;
  verbose?: boolean;
  key?: string;
  compress?: boolean;
  only?: (keyof engineDataTransfer.TransferGroupFilter)[];
  exclude?: (keyof engineDataTransfer.TransferGroupFilter)[];
  throttle?: number;
  maxSizeJsonl?: number;
}

/**
 * Export command.
 *
 * It transfers data from a local Strapi instance to a file
 *
 * @param {ExportCommandOptions} opts
 */
export default async (opts: CmdOptions) => {
  // Validate inputs from Commander
  if (!isObject(opts)) {
    exitWith(1, 'Could not parse command arguments');
  }

  normalizeExportDirFormatOpts(opts);

  const strapi = await createStrapiInstance();

  const source = createSourceProvider(strapi);
  const destination = createDestinationProvider(opts);

  const engine = engineDataTransfer.createTransferEngine(source, destination, {
    versionStrategy: 'ignore', // for an export to file, versionStrategy will always be skipped
    schemaStrategy: 'ignore', // for an export to file, schemaStrategy will always be skipped
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
          filter(entity) {
            return !isIgnoredContentType(entity.type);
          },
        },
      ],
    },
  });

  engine.diagnostics.onDiagnostic(formatDiagnostic('export', opts.verbose));

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

  progress.on('transfer::start', async () => {
    console.log(`Starting export...`);

    await strapi.telemetry.send('didDEITSProcessStart', getTransferTelemetryPayload(engine));
  });

  let results: engineDataTransfer.ITransferResults<typeof source, typeof destination>;
  let outFile: string;
  try {
    // Abort transfer if user interrupts process
    setSignalHandler(() => abortTransfer({ engine, strapi }));

    results = await engine.transfer();
    outFile = results.destination?.file?.path ?? '';
    if ((opts.format ?? 'tar') === 'dir') {
      const metadataPath = path.join(outFile, 'metadata.json');
      if (!(await fs.pathExists(metadataPath))) {
        throw new engineDataTransfer.errors.TransferEngineTransferError(
          `Export directory was not created correctly "${outFile}"`
        );
      }
    } else if (!(await fs.pathExists(outFile))) {
      throw new engineDataTransfer.errors.TransferEngineTransferError(
        `Export file not created "${outFile}"`
      );
    }

    // Note: we need to await telemetry or else the process ends before it is sent
    await strapi.telemetry.send('didDEITSProcessFinish', getTransferTelemetryPayload(engine));

    try {
      const table = buildTransferTable(results.engine);
      console.log(table?.toString());
    } catch (e) {
      console.error('There was an error displaying the results of the transfer.');
    }

    console.log(`Export archive is in ${chalk.green(outFile)}`);
    exitWith(0, exitMessageText('export'));
  } catch {
    await strapi.telemetry.send('didDEITSProcessFail', getTransferTelemetryPayload(engine));
    exitWith(1, exitMessageText('export', true));
  }
};

/**
 * It creates a local strapi destination provider
 */
const createSourceProvider = (strapi: Core.Strapi) => {
  return createLocalStrapiSourceProvider({
    async getStrapi() {
      return strapi;
    },
  });
};

/**
 * It creates a local file or directory destination provider based on the given options
 */
const createDestinationProvider = (opts: CmdOptions) => {
  const { file, compress, encrypt, key, maxSizeJsonl, format = 'tar' } = opts;

  const filepath = isString(file) && file.length > 0 ? file : getDefaultExportName();

  const maxSizeJsonlInMb = isFinite(toNumber(maxSizeJsonl))
    ? toNumber(maxSizeJsonl) * BYTES_IN_MB
    : undefined;

  if (format === 'dir') {
    const dirPath = path.isAbsolute(filepath) ? filepath : path.resolve(process.cwd(), filepath);
    return createLocalDirectoryDestinationProvider({
      directory: { path: dirPath },
      file: {
        maxSizeJsonl: maxSizeJsonlInMb,
      },
    });
  }

  return createLocalFileDestinationProvider({
    file: {
      path: filepath,
      maxSizeJsonl: maxSizeJsonlInMb,
    },
    encryption: {
      enabled: encrypt ?? false,
      key: encrypt ? key : undefined,
    },
    compression: {
      enabled: compress ?? false,
    },
  });
};
