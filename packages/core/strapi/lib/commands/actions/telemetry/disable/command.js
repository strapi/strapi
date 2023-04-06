'use strict';

const { getLocalScript } = require('../../../utils/helpers');

module.exports = ({ command /* , argv */ }) => {
  //    `$ strapi opt-out-telemetry`
  command
    .command('telemetry:disable')
    .description('Disable anonymous telemetry and metadata sending to Strapi analytics')
    .action(getLocalScript('telemetry/disable'));
};
