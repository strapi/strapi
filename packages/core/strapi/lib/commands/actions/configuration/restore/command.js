'use strict';

const { getLocalScript } = require('../../../utils/helpers');

/**
 * `$ strapi configuration:restore`
 * @param {import('../../../../types/core/commands').AddCommandOptions} options
 */
module.exports = ({ command }) => {
  command
    .command('configuration:restore')
    .alias('config:restore')
    .description('Restore configurations of your application')
    .option('-f, --file <file>', 'Input file, default input is stdin')
    .option('-s, --strategy <strategy>', 'Strategy name, one of: "replace", "merge", "keep"')
    .action(getLocalScript('configuration/restore'));
};
