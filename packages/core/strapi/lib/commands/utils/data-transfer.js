'use strict';

const chalk = require('chalk');
const Table = require('cli-table3');
const { Option } = require('commander');
const {
  engine: { TransferGroupPresets },
} = require('@strapi/data-transfer');

const {
  configs: { createOutputFileConfiguration },
  createLogger,
} = require('@strapi/logger');
const ora = require('ora');
const { TransferEngineInitializationError } = require('@strapi/data-transfer/dist/engine/errors');
const { merge } = require('lodash/fp');
const { readableBytes, exitWith } = require('./helpers');
const strapi = require('../../index');
const { getParseListWithChoices, parseInteger, confirmMessage } = require('./commander');

const exitMessageText = (process, error = false) => {
  const processCapitalized = process[0].toUpperCase() + process.slice(1);

  if (!error) {
    return chalk.bold(
      chalk.green(`${processCapitalized} process has been completed successfully!`)
    );
  }

  return chalk.bold(chalk.red(`${processCapitalized} process failed.`));
};

const pad = (n) => {
  return (n < 10 ? '0' : '') + String(n);
};

const yyyymmddHHMMSS = () => {
  const date = new Date();

  return (
    date.getFullYear() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
};

const getDefaultExportName = () => {
  return `export_${yyyymmddHHMMSS()}`;
};

const buildTransferTable = (resultData) => {
  // Build pretty table
  const table = new Table({
    head: ['Type', 'Count', 'Size'].map((text) => chalk.bold.blue(text)),
  });

  let totalBytes = 0;
  let totalItems = 0;
  Object.keys(resultData).forEach((key) => {
    const item = resultData[key];

    table.push([
      { hAlign: 'left', content: chalk.bold(key) },
      { hAlign: 'right', content: item.count },
      { hAlign: 'right', content: `${readableBytes(item.bytes, 1, 11)} ` },
    ]);
    totalBytes += item.bytes;
    totalItems += item.count;

    if (item.aggregates) {
      Object.keys(item.aggregates)
        .sort()
        .forEach((subkey) => {
          const subitem = item.aggregates[subkey];

          table.push([
            { hAlign: 'left', content: `-- ${chalk.bold.grey(subkey)}` },
            { hAlign: 'right', content: chalk.grey(subitem.count) },
            { hAlign: 'right', content: chalk.grey(`(${readableBytes(subitem.bytes, 1, 11)})`) },
          ]);
        });
    }
  });
  table.push([
    { hAlign: 'left', content: chalk.bold.green('Total') },
    { hAlign: 'right', content: chalk.bold.green(totalItems) },
    { hAlign: 'right', content: `${chalk.bold.green(readableBytes(totalBytes, 1, 11))} ` },
  ]);

  return table;
};

const DEFAULT_IGNORED_CONTENT_TYPES = [
  'admin::permission',
  'admin::user',
  'admin::role',
  'admin::api-token',
  'admin::api-token-permission',
  'admin::transfer-token',
  'admin::transfer-token-permission',
  'admin::audit-log',
];

const abortTransfer = async ({ engine, strapi }) => {
  try {
    await engine.abortTransfer();
    await strapi.destroy();
  } catch (e) {
    // ignore because there's not much else we can do
    return false;
  }
  return true;
};

const setSignalHandler = async (handler, signals = ['SIGINT', 'SIGTERM', 'SIGQUIT']) => {
  signals.forEach((signal) => {
    // We specifically remove ALL listeners because we have to clear the one added in Strapi bootstrap that has a process.exit
    // TODO: Ideally Strapi bootstrap would not add that listener, and then this could be more flexible and add/remove only what it needs to
    process.removeAllListeners(signal);
    process.on(signal, handler);
  });
};

const createStrapiInstance = async (opts = {}) => {
  try {
    const appContext = await strapi.compile();
    const app = strapi({ ...opts, ...appContext });

    app.log.level = opts.logLevel || 'error';
    return await app.load();
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      throw new Error('Process failed. Check the database connection with your Strapi project.');
    }
    throw err;
  }
};

const transferDataTypes = Object.keys(TransferGroupPresets);

const throttleOption = new Option(
  '--throttle <delay after each entity>',
  `Add a delay in milliseconds between each transferred entity`
)
  .argParser(parseInteger)
  .hideHelp(); // This option is not publicly documented

const excludeOption = new Option(
  '--exclude <comma-separated data types>',
  `Exclude data using comma-separated types. Available types: ${transferDataTypes.join(',')}`
).argParser(getParseListWithChoices(transferDataTypes, 'Invalid options for "exclude"'));

const onlyOption = new Option(
  '--only <command-separated data types>',
  `Include only these types of data (plus schemas). Available types: ${transferDataTypes.join(',')}`
).argParser(getParseListWithChoices(transferDataTypes, 'Invalid options for "only"'));

const validateExcludeOnly = (command) => {
  const { exclude, only } = command.opts();
  if (!only || !exclude) {
    return;
  }

  const choicesInBoth = only.filter((n) => {
    return exclude.indexOf(n) !== -1;
  });
  if (choicesInBoth.length > 0) {
    exitWith(
      1,
      `Data types may not be used in both "exclude" and "only" in the same command. Found in both: ${choicesInBoth.join(
        ','
      )}`
    );
  }
};

const errorColors = {
  fatal: chalk.red,
  error: chalk.red,
  silly: chalk.yellow,
};

const formatDiagnostic =
  (operation) =>
  ({ details, kind }) => {
    const logger = createLogger(
      createOutputFileConfiguration(`${operation}_error_log_${Date.now()}.log`)
    );
    try {
      if (kind === 'error') {
        const { message, severity = 'fatal' } = details;

        const colorizeError = errorColors[severity];
        const errorMessage = colorizeError(`[${severity.toUpperCase()}] ${message}`);

        logger.error(errorMessage);
      }
      if (kind === 'info') {
        const { message, params } = details;

        const msg = `${message}\n${params ? JSON.stringify(params, null, 2) : ''}`;

        logger.info(msg);
      }
      if (kind === 'warning') {
        const { origin, message } = details;

        logger.warn(`(${origin ?? 'transfer'}) ${message}`);
      }
    } catch (err) {
      logger.error(err);
    }
  };

const loadersFactory = (defaultLoaders = {}) => {
  const loaders = defaultLoaders;
  const updateLoader = (stage, data) => {
    if (!(stage in loaders)) {
      createLoader(stage);
    }
    const stageData = data[stage];
    const elapsedTime = stageData?.startTime
      ? (stageData?.endTime || Date.now()) - stageData.startTime
      : 0;
    const size = `size: ${readableBytes(stageData?.bytes ?? 0)}`;
    const elapsed = `elapsed: ${elapsedTime} ms`;
    const speed =
      elapsedTime > 0 ? `(${readableBytes(((stageData?.bytes ?? 0) * 1000) / elapsedTime)}/s)` : '';

    loaders[stage].text = `${stage}: ${stageData?.count ?? 0} transfered (${size}) (${elapsed}) ${
      !stageData?.endTime ? speed : ''
    }`;

    return loaders[stage];
  };

  const createLoader = (stage) => {
    Object.assign(loaders, { [stage]: ora() });
    return loaders[stage];
  };

  const getLoader = (stage) => {
    return loaders[stage];
  };

  return {
    updateLoader,
    createLoader,
    getLoader,
  };
};

/**
 * Get the telemetry data to be sent for a didDEITSProcess* event from an initialized transfer engine object
 *
 * @param {import('@strapi/data-transfer/types').ITransferEngine} engine Initialized transfer engine
 * @returns {object} Telemetry properties object
 */
const getTransferTelemetryPayload = (engine) => {
  return {
    eventProperties: {
      source: engine?.sourceProvider?.name,
      destination: engine?.destinationProvider?.name,
    },
  };
};

/**
 * Get a transfer engine schema diff handler that confirms with the user before bypassing a schema check
 */
const getDiffHandler = (engine, { force, action }) => {
  return async (context, next) => {
    // if we abort here, we need to actually exit the process because of conflict with inquirer prompt
    setSignalHandler(async () => {
      await abortTransfer({ engine, strapi });
      exitWith(1, exitMessageText(action, true));
    });

    let workflowsStatus;
    const source = 'Schema Integrity';

    Object.entries(context.diffs).forEach(([uid, diffs]) => {
      for (const diff of diffs) {
        const path = [uid].concat(diff.path).join('.');
        const endPath = diff.path[diff.path.length - 1];

        // Catch known features
        if (
          uid === 'admin::workflow' ||
          uid === 'admin::workflow-stage' ||
          endPath?.startsWith('strapi_stage') ||
          endPath?.startsWith('strapi_assignee')
        ) {
          workflowsStatus = diff.kind;
        }
        // handle generic cases
        else if (diff.kind === 'added') {
          engine.reportWarning(chalk.red(`${chalk.bold(path)} does not exist on source`), source);
        } else if (diff.kind === 'deleted') {
          engine.reportWarning(
            chalk.red(`${chalk.bold(path)} does not exist on destination`),
            source
          );
        } else if (diff.kind === 'modified') {
          engine.reportWarning(chalk.red(`${chalk.bold(path)} has a different data type`), source);
        }
      }
    });

    // output the known feature warnings
    if (workflowsStatus === 'added') {
      engine.reportWarning(chalk.red(`Review workflows feature does not exist on source`), source);
    } else if (workflowsStatus === 'deleted') {
      engine.reportWarning(
        chalk.red(`Review workflows feature does not exist on destination`),
        source
      );
    } else if (workflowsStatus === 'modified') {
      engine.panic(
        new TransferEngineInitializationError('Unresolved differences in schema [review workflows]')
      );
    }

    const confirmed = await confirmMessage(
      'There are differences in schema between the source and destination, and the data listed above will be lost. Are you sure you want to continue?',
      {
        force,
      }
    );

    // reset handler back to normal
    setSignalHandler(() => abortTransfer({ engine, strapi }));

    if (confirmed) {
      context.ignoredDiffs = merge(context.diffs, context.ignoredDiffs);
    }

    return next(context);
  };
};

const getAssetsBackupHandler = (engine, { force, action }) => {
  return async (context, next) => {
    // if we abort here, we need to actually exit the process because of conflict with inquirer prompt
    setSignalHandler(async () => {
      await abortTransfer({ engine, strapi });
      exitWith(1, exitMessageText(action, true));
    });

    console.warn(
      'The backup for the assets could not be created inside the public directory. Ensure Strapi has write permissions on the public directory.'
    );
    const confirmed = await confirmMessage(
      'Do you want to continue without backing up your public/uploads files?',
      {
        force,
      }
    );

    if (confirmed) {
      context.ignore = true;
    }

    // reset handler back to normal
    setSignalHandler(() => abortTransfer({ engine, strapi }));
    return next(context);
  };
};

const shouldSkipStage = (opts, dataKind) => {
  if (opts.exclude?.includes(dataKind)) {
    return true;
  }
  if (opts.only) {
    return !opts.only.includes(dataKind);
  }

  return false;
};

// Based on exclude/only from options, create the restore object to match
const parseRestoreFromOptions = (opts) => {
  const entitiesOptions = {
    exclude: DEFAULT_IGNORED_CONTENT_TYPES,
    include: undefined,
  };

  // if content is not included, send an empty array for include
  if ((opts.only && !opts.only.includes('content')) || opts.exclude?.includes('content')) {
    entitiesOptions.include = [];
  }

  const restoreConfig = {
    entities: entitiesOptions,
    assets: !shouldSkipStage(opts, 'files'),
    configuration: {
      webhooks: !shouldSkipStage(opts, 'config'),
      coreStore: !shouldSkipStage(opts, 'config'),
    },
  };

  return restoreConfig;
};

module.exports = {
  loadersFactory,
  buildTransferTable,
  getDefaultExportName,
  getTransferTelemetryPayload,
  DEFAULT_IGNORED_CONTENT_TYPES,
  createStrapiInstance,
  excludeOption,
  exitMessageText,
  onlyOption,
  throttleOption,
  validateExcludeOnly,
  formatDiagnostic,
  abortTransfer,
  setSignalHandler,
  getDiffHandler,
  getAssetsBackupHandler,
  shouldSkipStage,
  parseRestoreFromOptions,
};
