'use strict';

const { curry } = require('lodash/fp');

const pipeAsync = require('../pipe-async');
const traverseEntity = require('../traverse-entity');

const { removePassword, removePrivate } = require('./visitors');

const sanitizePasswords = curry((schema, entity) => {
  return traverseEntity(removePassword, { schema }, entity);
});

const sanitizePrivates = curry((schema, entity) => {
  return traverseEntity(removePrivate, { schema }, entity);
});

const defaultSanitizeOutput = curry((schema, entity) => {
  return pipeAsync(sanitizePrivates(schema), sanitizePasswords(schema))(entity);
});

module.exports = {
  sanitizePasswords,
  sanitizePrivates,
  defaultSanitizeOutput,
};
