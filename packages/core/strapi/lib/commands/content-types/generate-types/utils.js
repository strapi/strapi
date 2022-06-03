'use strict';

const chalk = require('chalk');
const fp = require('lodash/fp');

const logWarning = message => {
  console.log(chalk.yellow(`[${new Date().toLocaleTimeString()}] (warning):\t${message}`));
};

const getSchemaTypeName = fp.flow(fp.replace(/(:.)/, ' '), fp.camelCase, fp.upperFirst);

const toType = (object, formatOptions = {}) => {
  const {
    prefix = null,
    suffix = null,
    inline = false,
    indent = 2,
    indentStart = 0,
  } = formatOptions;

  if (fp.isNil(object) || fp.isEmpty(object)) {
    return null;
  }

  let definition = '';

  const properties = Object.entries(object);

  const lineBreak = (s = '') => (inline ? s : '\n');
  const offset = (m = 0) => ' '.repeat(indentStart + indent * m);
  const getPrefix = (s = '') => (prefix ? `${prefix}: ` : s);
  const getSuffix = (s = '') => suffix || s;

  for (const [key, value] of properties) {
    const validKey = key.includes('-') ? `'${key}'` : key;

    let row;

    // TODO: Handle arrays types

    // Handle recursive types (objects)
    if (fp.isObject(value) && !fp.isEmpty(value)) {
      row = toType(value, {
        prefix: validKey,
        indentStart: indentStart + indent,
        suffix,
        inline,
        indent,
      });
    }

    // All non-recursive types are handled there
    else {
      let type = value;

      if (fp.isString(value)) {
        type = `'${value}'`;
      }

      row = `${offset(1)}${validKey}: ${type};${lineBreak(' ')}`;
    }

    definition += row;
  }

  if (!inline) {
    definition = definition.slice(0, definition.length - 1);
  }

  return `${offset()}${getPrefix()}{${lineBreak(' ')}${definition}${lineBreak(
    ''
  )}${offset()}}${getSuffix()}${lineBreak()}`;
};

module.exports = {
  logWarning,
  getSchemaTypeName,
  toType,
};
