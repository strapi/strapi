'use strict';

const { createLogger, createOutputFileConfiguration } = require('@strapi/logger');
const chalk = require('chalk');

const logger = createLogger(createOutputFileConfiguration('data-transfer.log'));

const errorColors = {
  fatal: chalk.red,
  error: chalk.red,
  silly: chalk.yellow,
};

const formatDiagnosticErrors = ({ details, kind }) => {
  try {
    if (kind === 'error') {
      const { message, severity = 'fatal', error, details: moreDetails } = details;

      const detailsInfo = error ?? moreDetails;
      let errorMessage = errorColors[severity](`[${severity.toUpperCase()}] ${message}`);
      if (detailsInfo && detailsInfo.details) {
        const {
          origin,
          details: { step, details: stepDetails, ...moreInfo },
        } = detailsInfo;
        errorMessage = `${errorMessage}. Thrown at ${origin} during ${step}.\n`;
        if (stepDetails || moreInfo) {
          const { check, ...info } = stepDetails ?? moreInfo;
          errorMessage = `${errorMessage} Check ${check ?? ''}: ${JSON.stringify(info, null, 2)}`;
        }
      }

      logger.error(new Error(errorMessage, error));
    }
    if (kind === 'info') {
      const { message, params } = details;

      const msg =
        typeof message === 'function'
          ? message(params)
          : `${message}\n${params ? JSON.stringify(params, null, 2) : ''}`;

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

module.exports = formatDiagnosticErrors;
