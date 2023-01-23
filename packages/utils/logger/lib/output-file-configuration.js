'use strict';

const { transports, format } = require('winston');
const { LEVEL_LABEL, LEVELS } = require('./constants');
const { prettyPrint } = require('./formats');

const getPlainText = format.printf(({ message }) => {
  return message.replace(
    // eslint-disable-next-line no-control-regex
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
    ''
  );
});

const createOutputFileConfiguration = (filename) => {
  return {
    level: LEVEL_LABEL,
    levels: LEVELS,
    format: prettyPrint(),
    transports: [
      new transports.Console(),
      new transports.File({ level: 'error', filename, format: getPlainText }),
    ],
  };
};

module.exports = createOutputFileConfiguration;
