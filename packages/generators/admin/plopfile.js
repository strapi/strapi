'use strict';

/* eslint-disable eqeqeq */

const { ESLint } = require('eslint');
const componentGenerator = require('./component');

// This is used to be able to indent block inside Handlebars helpers and improve templates visibility.
// It's not very robust, and forces you to use 2 spaces indentation inside for your blocks.
// If it become a pain don't hesitate to remove it.
const leftShift = (str) => str.replace(/^ {2}/gm, '');

const evaluateExpression = (a, operator, b) => {
  switch (operator) {
    case '==':
      return a == b;
    case '===':
      return a === b;
    case '!=':
      return a != b;
    case '!==':
      return a !== b;
    case '<':
      return a < b;
    case '<=':
      return a <= b;
    case '>':
      return a > b;
    case '>=':
      return a >= b;
    case '&&':
      return a && b;
    case '||':
      return a || b;
    default:
      return false;
  }
};

/**
 * @param {import('plop').NodePlopAPI} plop
 */
module.exports = function generator(plop) {
  plop.setHelper('if', (...args) => {
    const end = args.length - 1;
    const { fn, inverse } = args[end];
    if (args.length === 2) {
      const condition = args[0];
      return leftShift(condition ? fn(this) : inverse(this));
    }
    const [a, operator, b] = Array.from(args).slice(0, end);
    return leftShift(evaluateExpression(a, operator, b) ? fn(this) : inverse(this));
  });

  plop.setHelper('unless', (...args) => {
    const end = args.length - 1;
    const { fn, inverse } = args[end];
    if (args.length === 2) {
      const condition = args[0];
      return leftShift(!condition ? fn(this) : inverse(this));
    }
    const [a, operator, b] = Array.from(args).slice(0, end);
    return leftShift(!evaluateExpression(a, operator, b) ? fn(this) : inverse(this));
  });

  plop.setHelper('else', (_, { fn }) => {
    return leftShift(fn(this));
  });

  plop.setActionType('lint', async (answers, config, plopfileApi) => {
    const { files } = config;
    const patterns = files.map((file) => plopfileApi.renderString(file, answers));

    const eslint = new ESLint({ fix: true });
    const results = await eslint.lintFiles(patterns);
    await ESLint.outputFixes(results);
    return 'Linting errors autofixed.';
  });

  plop.setGenerator('component', componentGenerator);
};
