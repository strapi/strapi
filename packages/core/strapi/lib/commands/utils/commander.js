'use strict';

const { parseType } = require('@strapi/utils/lib');

/**
 * Parse a string argument from the command line as a boolean
 */
const parseInputBool = (arg) => {
  try {
    return parseType({ type: 'boolean', value: arg });
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
};

/**
 * Parse a comma-delimited string as an array
 */
const parseInputList = (value) => {
  return value.split(',');
};

module.exports = {
  parseInputList,
  parseInputBool,
};
