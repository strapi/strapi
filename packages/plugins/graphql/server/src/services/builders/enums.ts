import { enumType } from 'nexus';
import { set } from 'lodash';
import { strings } from '@strapi/utils';

interface Definition {
  enum: string[];
}

/**
 * Build a Nexus enum type from a Strapi enum attribute
 * @param {object} definition - The definition of the enum
 * @param {string[]} definition.enum - The params of the enum
 * @param {string} name - The name of the enum
 * @return {NexusEnumTypeDef}
 */
const buildEnumTypeDefinition = (definition: Definition, name: string) => {
  return enumType({
    name,
    members: definition.enum.reduce(
      (acc, value) => set(acc, strings.toRegressedEnumValue(value), value),
      {}
    ),
  });
};

export default () => ({
  buildEnumTypeDefinition,
});
