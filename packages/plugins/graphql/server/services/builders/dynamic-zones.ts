import { StrapiCTX } from '../../types/strapi-ctx';

import { Kind, valueFromASTUntyped } from 'graphql';
import { omit } from 'lodash/fp';
import Utils from '@strapi/utils';
import { builder } from './pothosBuilder';

const { ApplicationError } = Utils.errors;

export default ({ strapi }: StrapiCTX) => {
  const buildTypeDefinition = (name: string, components: any[]) => {
    const { ERROR_TYPE_NAME } = strapi.plugin('graphql').service('constants');
    const isEmpty = components.length === 0;

    const componentsTypeNames = components.map((componentUID) => {
      const component = strapi.components[componentUID];

      if (!component) {
        throw new ApplicationError(
          `Trying to create a dynamic zone type with an unknown component: "${componentUID}"`
        );
      }

      return component.globalId;
    });

    return builder.unionType(name, {
      types: [...componentsTypeNames, ERROR_TYPE_NAME],
      resolveType(obj) {
        if (isEmpty) {
          return ERROR_TYPE_NAME;
        }

        return strapi.components[obj.__component].globalId;
      },
    });
  };

  const buildInputDefinition = (name, components) => {
    const parseData = (value) => {
      const component = Object.values(strapi.components).find(
        (component) => component.globalId === value.__typename
      );

      if (!component) {
        throw new ApplicationError(
          `Component not found. expected one of: ${components
            .map((uid) => strapi.components[uid].globalId)
            .join(', ')}`
        );
      }

      return {
        __component: component.uid,
        ...omit(['__typename'], value),
      };
    };

    return builder.scalarType(name, {
      serialize: (value) => value,

      parseValue: (value) => parseData(value),

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
     */
    buildDynamicZoneDefinition(definition: any, name: string, inputName: string) {
      const { components } = definition;

      const typeDefinition = buildTypeDefinition(name, components);
      const inputDefinition = buildInputDefinition(inputName, components);

      return [typeDefinition, inputDefinition];
    },
  };
};
