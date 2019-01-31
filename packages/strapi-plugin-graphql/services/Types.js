'use strict';

/**
 * Types.js service
 *
 * @description: A set of functions to make the schema easier to build.
 */

const _ = require('lodash');
const { GraphQLUpload } = require('apollo-server-koa');
const graphql = require('graphql');
const GraphQLJSON = require('graphql-type-json');
const GraphQLDateTime = require('graphql-type-datetime');
const pluralize = require('pluralize');
/* eslint-disable no-unused-vars */

module.exports = {
  /**
   * Convert Strapi type to GraphQL type.
   * @param {Object} attribute Information about the attribute.
   * @param {Object} attribute.definition Definition of the attribute.
   * @param {String} attribute.modelName Name of the model which owns the attribute.
   * @param {String} attribute.attributeName Name of the attribute.
   * @return String
   */

  convertType: function({
    definition = {},
    modelName = '',
    attributeName = '',
    rootType = 'query',
    action = ''
  }) {
    // Type
    if (definition.type) {
      let type = 'String';

      switch (definition.type) {
        // TODO: Handle fields of type Array, Perhaps default to [Int] or [String] ...
        case 'boolean':
          type = 'Boolean';
          break;
        case 'integer':
        case 'biginteger':
          type = 'Int';
          break;
        case 'decimal':
          type = 'Float';
          break;
        case 'float':
          type = 'Float';
          break;
        case 'json':
          type = 'JSON';
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

      if (definition.required && action !== 'update') {
        type += '!';
      }

      return type;
    }

    const ref = definition.model || definition.collection;

    // Association
    if (ref && ref !== '*') {
      // Add bracket or not
      const globalId = definition.plugin
        ? strapi.plugins[definition.plugin].models[ref].globalId
        : strapi.models[ref].globalId;
      const plural = !_.isEmpty(definition.collection);

      if (plural) {
        if (rootType === 'mutation') {
          return '[ID]';
        }

        return `[${globalId}]`;
      }

      if (rootType === 'mutation') {
        return 'ID';
      }

      return globalId;
    }

    if (rootType === 'mutation') {
      return definition.model ? 'ID' : '[ID]';
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

  convertEnumType: (definition, model, field) =>
    definition.enumName
      ? definition.enumName
      : `ENUM_${model.toUpperCase()}_${field.toUpperCase()}`,

  /**
   * Remove custom scalar type such as Upload because Apollo automatically adds it in the schema.
   * but we need to add it to print the schema on our side.
   *
   * @return void
   */

  removeCustomScalar: (typeDefs, resolvers) => {
    delete resolvers.Upload;
    return typeDefs.replace('scalar Upload', '');
  },

  /**
   * Add custom scalar type such as JSON.
   *
   * @return void
   */

  addCustomScalar: resolvers => {
    Object.assign(resolvers, {
      JSON: GraphQLJSON,
      DateTime: GraphQLDateTime,
      Upload: GraphQLUpload,
    });

    return 'scalar JSON \n scalar DateTime \n scalar Upload';
  },

  /**
   * Add Union Type that contains the types defined by the user.
   *
   * @return string
   */

  addPolymorphicUnionType: (customDefs, defs) => {
    const types = graphql
      .parse(customDefs + defs)
      .definitions.filter(
        def =>
          def.kind === 'ObjectTypeDefinition' && def.name.value !== 'Query',
      )
      .map(def => def.name.value);

    if (types.length > 0) {
      return {
        polymorphicDef: `union Morph = ${types.join(' | ')}`,
        polymorphicResolver: {
          Morph: {
            __resolveType(obj, context, info) {
              // eslint-disable-line no-unused-vars
              return obj.kind || obj._type;
            },
          },
        },
      };
    }

    return {
      polymorphicDef: '',
      polymorphicResolver: {},
    };
  },

  addInput: function() {
    return `
      input InputID { id: ID!}
    `;
  },

  generateInputModel: function(model, name) {
    const globalId = model.globalId;
    const inputName = `${_.capitalize(name)}Input`;

    /* eslint-disable */
    return `
      input ${inputName} {
        ${Object.keys(model.attributes)
          .map(attribute => {
            return `${attribute}: ${this.convertType({
              definition: model.attributes[attribute],
              modelName: globalId,
              attributeName: attribute,
              rootType: 'mutation',
            })}`;
          })
          .join('\n')}
      }

      input edit${inputName} {
        ${Object.keys(model.attributes)
          .map(attribute => {
            return `${attribute}: ${this.convertType({
              definition: model.attributes[attribute],
              modelName: globalId,
              attributeName: attribute,
              rootType: 'mutation',
              action: 'update'
            })}`;
          })
          .join('\n')}
      }
    `;
    /* eslint-enable */
  },

  generateInputPayloadArguments: function(model, name, type, resolver) {
    if (_.get(resolver, `Mutation.${type}${_.capitalize(name)}`) === false) {
      return '';
    }

    const inputName = `${_.capitalize(name)}Input`;
    const payloadName = `${_.capitalize(name)}Payload`;
    /* eslint-disable indent */
    switch (type) {
      case 'create':
        return `
          input ${type}${inputName} { data: ${inputName} }
          type ${type}${payloadName} { ${pluralize.singular(name)}: ${
          model.globalId
        } }
        `;
      case 'update':
        return `
          input ${type}${inputName}  { where: InputID, data: edit${inputName} }
          type ${type}${payloadName} { ${pluralize.singular(name)}: ${
          model.globalId
        } }
        `;
      case 'delete':
        return `
          input ${type}${inputName}  { where: InputID }
          type ${type}${payloadName} { ${pluralize.singular(name)}: ${
          model.globalId
        } }
        `;
      default:
      // Nothing
    }
    /* eslint-enable indent */
  },
};
