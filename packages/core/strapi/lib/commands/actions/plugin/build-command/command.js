'use strict';

const { forceOption } = require('../../../utils/commander');
const { getLocalScript } = require('../../../utils/helpers');

/**
 * `$ strapi plugin:build`
 * @param {import('../../../../types/core/commands').AddCommandOptions} options
 */
module.exports = ({ command }) => {
  command
    .command('plugin:build')
    .description('Bundle your strapi plugin for publishing.')
    .addOption(forceOption)
    .option('-d, --debug', 'Enable debugging mode with verbose logs', false)
    .action(getLocalScript('plugin/build-command'));
};
