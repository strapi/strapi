'use strict';

const { getLocalScript } = require('../../../utils/helpers');

/**
 * `$ strapi telemetry:enable`
 * @param {import('../../../../types/core/commands').AddCommandOptions} options
 */
module.exports = ({ command }) => {
  command
    .command('telemetry:enable')
    .description('Enable anonymous telemetry and metadata sending to Strapi analytics')
    .action(getLocalScript('telemetry/enable'));
};
