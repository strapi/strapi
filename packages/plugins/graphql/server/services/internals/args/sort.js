'use strict';

const { arg, list } = require('nexus');

const SortArg = arg({
  type: list('String'),
  default: [],
});

module.exports = SortArg;
