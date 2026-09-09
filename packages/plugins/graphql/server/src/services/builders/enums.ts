import { enumType } from 'nexus';
import { strings } from '@strapi/utils';

interface Definition {
  enum: string[];
}

/**
 * GraphQL forbids enum *names* that collide with language literals (`true`, `false`, `null`).
 * Strapi stores those as ordinary strings (and JSON/YAML may coerce them to booleans/null).
 * Keep the original string as the runtime value and only rename the GraphQL identifier.
 *
 * @see https://spec.graphql.org/October2021/#sec-Enum-Value
 * @see https://github.com/strapi/strapi/issues/23720
 */
const GRAPHQL_RESERVED_ENUM_NAMES = new Set(['true', 'false', 'null']);

const toGraphQLEnumName = (value: string) => {
  const name = strings.toRegressedEnumValue(value);

  return GRAPHQL_RESERVED_ENUM_NAMES.has(name) ? `_${name}` : name;
};

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
    members: definition.enum.reduce<Record<string, string>>((acc, value) => {
      const original = String(value);
      acc[toGraphQLEnumName(original)] = original;
      return acc;
    }, {}),
  });
};

export default () => ({
  buildEnumTypeDefinition,
});
