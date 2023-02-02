'use strict';

const SortArg = require('./sort');
const publicationState = require('./publication-state');
const PaginationArg = require('./pagination');

module.exports = (context) => ({
  SortArg,
  PaginationArg,
  PublicationStateArg: publicationState(context),
});
