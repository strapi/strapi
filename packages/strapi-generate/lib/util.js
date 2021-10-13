'use strict';

/**
 * From Express core: (MIT License)
 *
 * Normalize the given path string,
 * returning a regular expression.
 *
 * An empty array should be passed,
 * which will contain the placeholder
 * key names. For example "/user/:id" will
 * then contain ["id"].
 *
 * @param  {String|RegExp|Array} path
 * @param  {Array} keys
 * @param  {Boolean} sensitive
 * @param  {Boolean} strict
 * @return {RegExp}
 * @api private
 */

/* eslint-disable prefer-template */
/* eslint-disable no-useless-escape */
const pathRegexp = (path, keys, sensitive, strict) => {
  if (toString.call(path) === '[object RegExp]') {
    return path;
  }
  if (Array.isArray(path)) {
    path = '(' + path.join('|') + ')';
  }
  path = path
    .concat(strict ? '' : '/?')
    .replace(/\/\(/g, '(?:/')
    .replace(
      /(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?(\*)?/g,
      (_, slash, format, key, capture, optional, star) => {
        keys.push({
          name: key,
          optional: !!optional,
        });
        slash = slash || '';
        return (
          '' +
          (optional ? '' : slash) +
          '(?:' +
          (optional ? slash : '') +
          (format || '') +
          (capture || (format && '([^/.]+?)') || '([^/]+?)') +
          ')' +
          (optional || '') +
          (star ? '(/*)?' : '')
        );
      }
    )
    .replace(/([\/.])/g, '\\$1')
    .replace(/\*/g, '(.*)');
  return new RegExp('^' + path + '$', sensitive ? '' : 'i');
};

module.exports = {
  pathRegexp,
};
