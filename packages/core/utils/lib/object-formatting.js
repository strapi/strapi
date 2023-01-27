'use strict';

const _ = require('lodash');

const removeUndefined = (obj) => _.pickBy(obj, (value) => typeof value !== 'undefined');

const keysDeep = (obj, path = []) =>
  !_.isObject(obj)
    ? path.join('.')
    : _.reduce(obj, (acc, next, key) => _.concat(acc, keysDeep(next, [...path, key])), []);

module.exports = {
  removeUndefined,
  keysDeep,
};
