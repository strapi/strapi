'use strict';

const SortArg = require('./sort');
const publicationState = require('./publication-state');
const PaginationArg = require('./pagination');

module.exports = (context) => ({
  SortArg: (t) => SortArg(t),
  PaginationArg: (t) => PaginationArg(t),
  PublicationStateArg: (t) => publicationState(context, t),
});
