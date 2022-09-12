'use strict';

const { curry } = require('lodash/fp');
const { traverseEntity, pipeAsync } = require('@strapi/utils');

const { removeUserRelationFromRoleEntities } = require('./visitors');

const sanitizeUserRelationFromRoleEntities = curry((schema, entity) => {
  return traverseEntity(removeUserRelationFromRoleEntities, { schema }, entity);
});

const defaultSanitizeOutput = curry((schema, entity) => {
  return pipeAsync(sanitizeUserRelationFromRoleEntities(schema))(entity);
});

module.exports = {
  sanitizeUserRelationFromRoleEntities,
  defaultSanitizeOutput,
};
