'use strict';

const { curry } = require('lodash/fp');

const traverseEntity = require('../traverse-entity');
const { removePassword, removePrivate } = require('./visitors');

const sanitizePasswords = curry((schema, entity) => {
  return traverseEntity(removePassword, { schema }, entity);
});

const sanitizePrivates = curry((schema, entity) => {
  return traverseEntity(removePrivate, { schema }, entity);
});

const removePrivateAndPasswords = (ctx, utils) => {
  removePassword(ctx, utils);
  removePrivate(ctx, utils);
};

const defaultSanitizeOutput = curry((schema, entity) => {
  return traverseEntity(removePrivateAndPasswords, { schema }, entity);
});

module.exports = {
  sanitizePasswords,
  sanitizePrivates,
  defaultSanitizeOutput,
};
