'use strict';

const { getLocalScript } = require('../../../utils/helpers');

module.exports = ({ command /* , argv */ }) => {
  command
    .command('configuration:restore')
    .alias('config:restore')
    .description('Restore configurations of your application')
    .option('-f, --file <file>', 'Input file, default input is stdin')
    .option('-s, --strategy <strategy>', 'Strategy name, one of: "replace", "merge", "keep"')
    .action(getLocalScript('configuration/restore'));
};
