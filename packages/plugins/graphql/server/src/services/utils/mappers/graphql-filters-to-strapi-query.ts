import { has, propEq, isNil, isDate, isObject } from 'lodash/fp';
import type { Struct } from '@strapi/types';
import type { Context } from '../../types';

// todo[v4]: Find a way to get that dynamically
const virtualScalarAttributes = ['id', 'documentId'];

export default ({ strapi }: Context) => {
  const { service: getService } = strapi.plugin('graphql');

  const recursivelyReplaceScalarOperators = (data: any): any => {
    const { operators } = getService('builders').filters;

    if (Array.isArray(data)) {
      return data.map(recursivelyReplaceScalarOperators);
    }

    // Note: We need to make an exception for date since GraphQL
    // automatically cast date strings to date instances in args
    if (isDate(data) || !isObject(data)) {
      return data;
    }

    const result: any = {};

    for (const [key, value] of Object.entries(data)) {
      const isOperator = !!operators[key];

      const newKey = isOperator ? operators[key].strapiOperator : key;

      result[newKey] = recursivelyReplaceScalarOperators(value);
    }

    return result;
  };

  return {
    /**
     * Transform one or many GraphQL filters object into a valid Strapi query
     * @param {object | object[]} filters
     * @param {object} contentType
     * @return {object | object[]}
     */
    graphQLFiltersToStrapiQuery(filters: any, contentType: Struct.Schema): any {
      const { isStrapiScalar, isMedia, isRelation, isComponent } = getService('utils').attributes;
      const { operators } = getService('builders').filters;

      const ROOT_LEVEL_OPERATORS = [operators.and, operators.or, operators.not];

      // Handle unwanted scenario where there is no filters defined
      if (isNil(filters)) {
        return {};
      }

      // If filters is a collection, then apply the transformation to every item of the list
      if (Array.isArray(filters)) {
        return filters.map((filtersItem) =>
          this.graphQLFiltersToStrapiQuery(filtersItem, contentType)
        );
      }

      const resultMap: any = {};
      const { attributes } = contentType;

      const isAttribute = (attributeName: string) => {
        return virtualScalarAttributes.includes(attributeName) || has(attributeName, attributes);
      };

      for (const [key, value] of Object.entries(filters)) {
        // If the key is an attribute, update the value
        if (isAttribute(key)) {
          const attribute: any = attributes[key];

          // If it's a scalar attribute
          if (virtualScalarAttributes.includes(key) || isStrapiScalar(attribute)) {
            // Replace (recursively) every GraphQL scalar operator with the associated Strapi operator
            resultMap[key] = recursivelyReplaceScalarOperators(value);
          }

          // If it's a deep filter on a relation
          else if (isRelation(attribute) || isMedia(attribute)) {
            // Fetch the model from the relation
            const relModel = strapi.getModel(attribute.target);

            // Recursively apply the mapping to the value using the fetched model,
            // and update the value within `resultMap`
            resultMap[key] = this.graphQLFiltersToStrapiQuery(value, relModel);
          }

          // If it's a deep filter on a component
          else if (isComponent(attribute)) {
            // Fetch the model from the component attribute
            const componentModel = strapi.getModel(attribute.component);

            // Recursively apply the mapping to the value using the fetched model,
            // and update the value within `resultMap`
            resultMap[key] = this.graphQLFiltersToStrapiQuery(value, componentModel);
          }
        }

        // Handle the case where the key is not an attribute (operator, ...)
        else {
          const rootLevelOperator = ROOT_LEVEL_OPERATORS.find(propEq('fieldName', key));

          // If it's a root level operator (AND, NOT, OR, ...)
          if (rootLevelOperator) {
            const { strapiOperator } = rootLevelOperator;

            // Transform the current value recursively and add it to the resultMap
            // object using the strapiOperator equivalent of the GraphQL key
            resultMap[strapiOperator] = this.graphQLFiltersToStrapiQuery(value, contentType);
          }
        }
      }

      return resultMap;
    },
  };
};
