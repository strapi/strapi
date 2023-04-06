'use strict';

const { getLocalScript } = require('../../../utils/helpers');

module.exports = ({ command /* , argv */ }) => {
  //    `$ strapi opt-in-telemetry`
  command
    .command('telemetry:enable')
    .description('Enable anonymous telemetry and metadata sending to Strapi analytics')
    .action(getLocalScript('telemetry/enable'));
};
