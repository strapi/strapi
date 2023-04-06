'use strict';

const { getLocalScript } = require('../../../utils/helpers');

/**
 * `$ strapi telemetry:disable`
 * @param {import('../../../../types/core/commands').AddCommandOptions} options
 */
module.exports = ({ command }) => {
  command
    .command('telemetry:disable')
    .description('Disable anonymous telemetry and metadata sending to Strapi analytics')
    .action(getLocalScript('telemetry/disable'));
};
