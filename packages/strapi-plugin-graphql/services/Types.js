'use strict';

/**
 * Types.js service
 *
 * @description: A set of functions to make the schema easier to build.
 */

const _ = require('lodash');
const graphql = require('graphql');
const GraphQLJSON = require('graphql-type-json');
const GraphQLDateTime = require('graphql-type-datetime');

module.exports = {
  /**
   * Convert Strapi type to GraphQL type.
   * @param {Object} attribute Information about the attribute.
   * @param {Object} attribute.definition Definition of the attribute.
   * @param {String} attribute.modelName Name of the model which owns the attribute.
   * @param {String} attribute.attributeName Name of the attribute.
   * @return String
   */

  convertType: function ({ definition = {}, modelName = '', attributeName = '' }) {
    // Type
    if (definition.type) {
      let type = 'String';

      switch (definition.type) {
        // TODO: Handle fields of type Array, Perhaps default to [Int] or [String] ...
        case 'boolean':
          type = 'Boolean';
          break;
        case 'integer':
          type = 'Int';
          break;
        case 'float':
          type = 'Float';
          break;
        case 'time':
        case 'date':
        case 'datetime':
        case 'timestamp':
          type = 'DateTime';
          break;
        case 'enumeration':
          type = this.convertEnumType(definition, modelName, attributeName);
          break;
      }

      if (definition.required) {
        type += '!';
      }

      return type;
    }

    const ref = definition.model || definition.collection;

    // Association
    if (ref && ref !== '*') {
      // Add bracket or not
      const globalId = definition.plugin ?
        strapi.plugins[definition.plugin].models[ref].globalId:
        strapi.models[ref].globalId;
      const plural = !_.isEmpty(definition.collection);

      if (plural) {
        return `[${globalId}]`;
      }

      return globalId;
    }

    return definition.model ? 'Morph' : '[Morph]';
  },

  /**
   * Convert Strapi enumeration to GraphQL Enum.
   * @param {Object} definition Definition of the attribute.
   * @param {String} model Name of the model which owns the attribute.
   * @param {String} field Name of the attribute.
   * @return String
   */
  
  convertEnumType: (definition, model, field) => definition.enumName ? definition.enumName : `ENUM_${model.toUpperCase()}_${field.toUpperCase()}`,

  /**
   * Add custom scalar type such as JSON.
   *
   * @return void
   */

  addCustomScalar: (resolvers) => {
    Object.assign(resolvers, {
      JSON: GraphQLJSON,
      DateTime: GraphQLDateTime,
    });

    return 'scalar JSON \n scalar DateTime';
  },

  /**
   * Add Union Type that contains the types defined by the user.
   *
   * @return string
   */

  addPolymorphicUnionType: (customDefs, defs) => {
    const types = graphql.parse(customDefs + defs).definitions
      .filter(def => def.kind === 'ObjectTypeDefinition' && def.name.value !== 'Query')
      .map(def => def.name.value);

    if (types.length > 0) {
      return {
        polymorphicDef: `union Morph = ${types.join(' | ')}`,
        polymorphicResolver: {
          Morph: {
            __resolveType(obj, context, info) { // eslint-disable-line no-unused-vars
              return obj.kind || obj._type;
            }
          }
        }
      };
    }

    return {
      polymorphicDef: '',
      polymorphicResolver: {}
    };
  },
};