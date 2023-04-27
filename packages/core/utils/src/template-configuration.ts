import { isString, isPlainObject } from 'lodash';

const regex = /\$\{[^()]*\}/g;
const excludeConfigPaths = ['info.scripts'];

/**
 * Allow dynamic config values through the native ES6 template string function.
 */
const templateConfiguration = (obj: Record<string, any>, configPath = '') => {
  // Allow values which looks like such as an ES6 literal string without parenthesis inside (aka function call).
  // Exclude config with conflicting syntax (e.g. npm scripts).
  return Object.keys(obj).reduce((acc, key) => {
    if (isPlainObject(obj[key]) && !isString(obj[key])) {
      acc[key] = templateConfiguration(obj[key], `${configPath}.${key}`);
    } else if (
      isString(obj[key]) &&
      !excludeConfigPaths.includes(configPath.substr(1)) &&
      obj[key].match(regex) !== null
    ) {
      // eslint-disable-next-line prefer-template, no-eval
      acc[key] = eval('`' + obj[key] + '`');
    } else {
      acc[key] = obj[key];
    }

    return acc;
  }, {} as Record<string, any>);
};

export = templateConfiguration;
