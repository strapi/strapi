'use strict';

const { enumType } = require('nexus');
const { set } = require('lodash/fp');

/**
 * Build a Nexus enum type from a Strapi enum attribute
 * @param {object} definition - The definition of the enum
 * @param {string[]} definition.enum - The params of the enum
 * @param {string} name - The name of the enum
 * @return {NexusEnumTypeDef}
 */
const buildEnumTypeDefinition = (definition, name) => {
  return enumType({
    name,
    // In Strapi V3, the key of an enum is also its value
    // todo[V4]: allow passing an object of key/value instead of an array
    members: definition.enum.reduce((acc, value) => set(value, value, acc), {}),
  });
};

module.exports = () => ({
  buildEnumTypeDefinition,
});
