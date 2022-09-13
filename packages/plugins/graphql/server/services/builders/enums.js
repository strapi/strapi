'use strict';

const { enumType } = require('nexus');
const { set } = require('lodash/fp');
const { toRegressedEnumValue } = require('@strapi/utils');

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
    members: definition.enum.reduce(
      (acc, value) => set(toRegressedEnumValue(value), value, acc),
      {}
    ),
  });
};

module.exports = () => ({
  buildEnumTypeDefinition,
});
