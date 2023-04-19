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
const { readableBytes, exitWith } = require('../utils/helpers');
const strapi = require('../../index');
const { getParseListWithChoices, parseInteger } = require('../utils/commander');

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

module.exports = {
  loadersFactory,
  buildTransferTable,
  getDefaultExportName,
  DEFAULT_IGNORED_CONTENT_TYPES,
  createStrapiInstance,
  excludeOption,
  exitMessageText,
  onlyOption,
  throttleOption,
  validateExcludeOnly,
  formatDiagnostic,
  abortTransfer,
};
