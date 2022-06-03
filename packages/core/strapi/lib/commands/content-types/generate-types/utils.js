'use strict';

const chalk = require('chalk');
const fp = require('lodash/fp');

const logWarning = message => {
  console.log(chalk.yellow(`[${new Date().toLocaleTimeString()}] (warning):\t${message}`));
};

const getSchemaTypeName = fp.flow(fp.replace(/(:.)/, ' '), fp.camelCase, fp.upperFirst);

const mapKeyValuesToType = (object, typeName, indent = 0) => {
  if (!object || fp.isEmpty(object)) {
    return null;
  }

  const formattedTypeName = typeName.includes('-') ? `'${typeName}'` : typeName;

  const properties = Object.entries(object)
    .reduce((acc, [key, value]) => {
      const offset = ' '.repeat(indent + 2);
      const formattedKey = key.includes('-') ? `'${key}'` : key;

      // Common values
      let newValue = value;

      // Object values
      if (fp.isObject(value)) {
        return `${acc}
${mapKeyValuesToType(value, key, indent + 2)}`;
      }

      // String values
      else if (fp.isString(value)) {
        newValue = `'${value}'`;
      }

      return `${acc}
${offset}${formattedKey}: ${newValue}`;
    }, '')
    // Removing leading \n (when acc is an empty string)
    .slice(1);

  return `${' '.repeat(indent)}${formattedTypeName}: {
${properties}
${' '.repeat(indent)}};`;
};

module.exports = {
  logWarning,
  getSchemaTypeName,
  mapKeyValuesToType,
};
