'use strict';

const chalk = require('chalk');
const Table = require('cli-table3');
const { readableBytes } = require('../utils');

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
      Object.keys(item.aggregates).forEach((subkey) => {
        const subitem = item.aggregates[subkey];

        table.push([
          { hAlign: 'left', content: `-- ${chalk.bold(subkey)}` },
          { hAlign: 'right', content: subitem.count },
          { hAlign: 'right', content: `(${chalk.grey(readableBytes(subitem.bytes, 1, 11))})` },
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

module.exports = {
  buildTransferTable,
  yyyymmddHHMMSS,
};
