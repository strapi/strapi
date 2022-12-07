import { set } from 'lodash/fp';
import { toRegressedEnumValue } from '@strapi/utils';
import { builder } from './pothosBuilder';

/**
 * Build a Nexus enum type from a Strapi enum attribute
 */
const buildEnumTypeDefinition = (definition: { enum: string[] }, name: string) => {
  return builder.enumType(name, {
    values: definition.enum.reduce(
      (acc, value) => set(toRegressedEnumValue(value), value, acc),
      {}
    ),
  });
};

export default () => ({
  buildEnumTypeDefinition,
});
