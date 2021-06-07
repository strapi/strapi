'use strict';

const { join } = require('path');
const { reduce } = require('lodash/fp');
const { makeSchema } = require('nexus');

const { buildEnumType, buildType, buildEntity, buildEntityMeta } = require('../builders');
const { utils } = require('../../types');

const buildAPISchema = contentTypes => {
  return makeSchema({
    types: buildAPITypes(contentTypes),
    outputs: {
      typegen: join(__dirname, '..', 'nexus-typegen.ts'),
      schema: join(__dirname, '..', 'schema.graphql'),
    },
  });
};

const buildAPITypes = contentTypes => {
  const enumsType = buildEnumsTypeMap(contentTypes);
  const types = buildTypeMap(contentTypes);
  const entitiesMeta = buildEntitiesMetaTypeMap(contentTypes);
  const entities = buildEntitiesTypeMap(contentTypes);

  return {
    ...enumsType,
    ...types,
    ...entitiesMeta,
    ...entities,
  };
};

const buildEnumsTypeMap = contentTypes => {
  const enumsType = {};

  contentTypes.forEach(contentType => {
    const { attributes } = contentType;

    // Only keep attributes of type enumeration
    const enumAttributes = Object.keys(attributes).filter(key =>
      utils.isEnumeration(attributes[key])
    );

    // For each enum attribute, build its associated Nexus type and add it to the final map
    for (const attributeName of enumAttributes) {
      const attribute = attributes[attributeName];
      const enumName = utils.getEnumName(contentType, attributeName);

      enumsType[enumName] = buildEnumType(attribute, enumName);
    }
  });

  return enumsType;
};

const buildTypeMap = createTypesMapBuilder(buildType, utils.getTypeName);

const buildEntitiesMetaTypeMap = createTypesMapBuilder(buildEntityMeta, utils.getEntityMetaName);

const buildEntitiesTypeMap = createTypesMapBuilder(buildEntity, utils.getEntityName);

const createTypesMapBuilder = (builder, getName) => {
  return reduce(
    (types, contentType) => ({ ...types, [getName(contentType)]: builder(contentType) }),
    {}
  );
};

module.exports = { buildAPITypes, buildAPISchema };
