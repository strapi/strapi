'use strict';

const { getLocalScript } = require('../../../utils/helpers');

/**
 * `$ strapi plugin:build`
 * @param {import('../../../../types/core/commands').AddCommandOptions} options
 */
module.exports = ({ command }) => {
  command
    .command('plugin:build')
    .description('Bundle your strapi plugin for publishing.')
    .option('-y, --yes', 'Skip all confirmation prompts', false)
    .option('-d, --debug', 'Enable debugging mode with verbose logs', false)
    .action(getLocalScript('plugin/build-command'));
};
