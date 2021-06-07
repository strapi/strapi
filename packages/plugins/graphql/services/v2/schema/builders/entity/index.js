'use strict';

const { objectType } = require('nexus');

const { utils } = require('../../../types/index');

const { buildType } = require('./type');
const { buildEntityMeta } = require('./meta');

/**
 * Build a higher level type for a content type which contains both the attributes, the ID and the metadata
 * @param {object} contentType The content type which will be used to build its entity type
 * @return {NexusObjectTypeDef<string>}
 */
const buildEntity = contentType => {
  const entityName = utils.getEntityName(contentType);
  const typeName = utils.getTypeName(contentType);

  return objectType({
    name: entityName,

    definition(t) {
      t.int('id');
      t.field('attributes', { type: typeName });
      // todo[v4]: add the meta field to the entity when there will be data in it
      // t.field('meta', { type: utils.getEntityMetaName(contentType) });
    },
  });
};

module.exports = { buildEntity, buildType, buildEntityMeta };
