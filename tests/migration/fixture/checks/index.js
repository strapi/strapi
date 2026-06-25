'use strict';

const rowCounts = require('./row-counts');
const documentIdBackfill = require('./document-id-backfill');
const draftPublishPair = require('./draft-publish-pair');
const relationTargets = require('./relation-targets');
const joinTableParity = require('./join-table-parity');
const relationApiParity = require('./relation-api-parity');
const entityGraph = require('./entity-graph');
const mediaParity = require('./media-parity');
const nestedComponentParity = require('./nested-component-parity');
const dbMorphAndDz = require('./db-morph-and-dz');

/** Checks in run order (matches legacy validate-migration.js section order). */
const ALL_CHECKS = [
  rowCounts,
  documentIdBackfill,
  draftPublishPair,
  relationTargets,
  joinTableParity,
  relationApiParity,
  entityGraph,
  mediaParity,
  nestedComponentParity,
  dbMorphAndDz,
];

const CHECKS_BY_ID = Object.fromEntries(ALL_CHECKS.map((check) => [check.id, check]));

module.exports = {
  ALL_CHECKS,
  CHECKS_BY_ID,
};
