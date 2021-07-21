'use strict';

const componentGenerator = require('./component');

// This is used to be able to indent block inside Handlebars helpers and improve templates visibility.
// It's not very robust, and forces you to use 2 spaces indentation inside for your blocks.
// If it become a pain don't hesitate to remove it.
const leftShift = str => str.replace(/^ {2}/gm, '');

// ! Don't use arrow functions to register Handlebars helpers
module.exports = function(
  /** @type {import('plop').NodePlopAPI} */
  plop
) {
  plop.setHelper('if', function(condition, { fn, inverse }) {
    return leftShift(condition ? fn(this) : inverse(this));
  });
  plop.setHelper('else', function(_, { fn }) {
    return leftShift(fn(this));
  });
  plop.setHelper('or', function(/* ...args, options */) {
    const end = arguments.length - 1;
    const { fn, inverse } = arguments[end];
    return leftShift(
      Array.from(arguments)
        .slice(0, end)
        .some(arg => Boolean(arg))
        ? fn(this)
        : inverse(this)
    );
  });
  plop.setGenerator('component', componentGenerator);
};
