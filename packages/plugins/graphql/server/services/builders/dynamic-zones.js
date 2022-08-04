'use strict';

const { Kind, valueFromASTUntyped } = require('graphql');
const { omit } = require('lodash/fp');
const { unionType, scalarType } = require('nexus');
const { ApplicationError } = require('@strapi/utils').errors;

module.exports = ({ strapi }) => {
  const buildTypeDefinition = (name, components) => {
    const { ERROR_TYPE_NAME } = strapi.plugin('graphql').service('constants');
    const isEmpty = components.length === 0;

    const componentsTypeNames = components.map(componentUID => {
      const component = strapi.components[componentUID];

      if (!component) {
        throw new ApplicationError(
          `Trying to create a dynamic zone type with an unknown component: "${componentUID}"`
        );
      }

      return component.globalId;
    });

    return unionType({
      name,

      resolveType(obj) {
        if (isEmpty) {
          return ERROR_TYPE_NAME;
        }

        return strapi.components[obj.__component].globalId;
      },

      definition(t) {
        t.members(...componentsTypeNames, ERROR_TYPE_NAME);
      },
    });
  };

  const buildInputDefinition = (name, components) => {
    const parseData = value => {
      const component = Object.values(strapi.components).find(
        component => component.globalId === value.__typename
      );

      if (!component) {
        throw new ApplicationError(
          `Component not found. expected one of: ${components
            .map(uid => strapi.components[uid].globalId)
            .join(', ')}`
        );
      }

      return {
        __component: component.uid,
        ...omit(['__typename'], value),
      };
    };

    return scalarType({
      name,

      serialize: value => value,

      parseValue: value => parseData(value),

      parseLiteral(ast, variables) {
        if (ast.kind !== Kind.OBJECT) {
          return undefined;
        }

        const value = valueFromASTUntyped(ast, variables);
        return parseData(value);
      },
    });
  };

  return {
    /**
     * Build a Nexus dynamic zone type from a Strapi dz attribute
     * @param {object} definition - The definition of the dynamic zone
     * @param {string} name - the name of the dynamic zone
     * @param {string} inputName - the name of the dynamic zone's input
     * @return {[NexusUnionTypeDef, NexusScalarTypeDef]}
     */
    buildDynamicZoneDefinition(definition, name, inputName) {
      const { components } = definition;

      const typeDefinition = buildTypeDefinition(name, components);
      const inputDefinition = buildInputDefinition(inputName, components);

      return [typeDefinition, inputDefinition];
    },
  };
};
