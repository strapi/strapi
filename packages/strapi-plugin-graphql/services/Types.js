'use strict';

/**
 * Types.js service
 *
 * @description: A set of functions to make the schema easier to build.
 */

const _ = require('lodash');
const { GraphQLUpload } = require('apollo-server-koa');
const graphql = require('graphql');
const { GraphQLJSON } = require('graphql-type-json');
const { GraphQLDate, GraphQLDateTime } = require('graphql-iso-date');
const Time = require('../types/time');
const GraphQLLong = require('graphql-type-long');

const { toSingular } = require('./naming');

module.exports = {
  /**
   * Convert Strapi type to GraphQL type.
   * @param {Object} attribute Information about the attribute.
   * @param {Object} attribute.definition Definition of the attribute.
   * @param {String} attribute.modelName Name of the model which owns the attribute.
   * @param {String} attribute.attributeName Name of the attribute.
   * @return String
   */

  convertType({
    definition = {},
    modelName = '',
    attributeName = '',
    rootType = 'query',
    action = '',
  }) {
    // Type
    if (
      definition.type &&
      definition.type !== 'component' &&
      definition.type !== 'dynamiczone'
    ) {
      let type = 'String';

      switch (definition.type) {
        // TODO: Handle fields of type Array, Perhaps default to [Int] or [String] ...
        case 'boolean':
          type = 'Boolean';
          break;
        case 'integer':
          type = 'Int';
          break;
        case 'biginteger':
          type = 'Long';
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
        case 'date':
          type = 'Date';
          break;
        case 'time':
          type = 'Time';
          break;
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

    if (definition.type === 'component') {
      const globalId = strapi.components[definition.component].globalId;

      const { required, repeatable } = definition;
      let typeName = required === true ? `${globalId}` : globalId;

      if (rootType === 'mutation') {
        typeName =
          action === 'update'
            ? `edit${_.upperFirst(toSingular(globalId))}Input`
            : `${_.upperFirst(toSingular(globalId))}Input${
                required ? '!' : ''
              }`;
      }

      if (repeatable === true) {
        return `[${typeName}]`;
      }
      return `${typeName}`;
    }

    if (definition.type === 'dynamiczone') {
      const { required } = definition;

      const unionName = `${modelName}${_.upperFirst(
        _.camelCase(attributeName)
      )}DynamicZone`;

      let typeName = unionName;

      if (rootType === 'mutation') {
        typeName = `${unionName}Input!`;
      }

      return `[${typeName}]${required ? '!' : ''}`;
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

  convertEnumType(definition, model, field) {
    return definition.enumName
      ? definition.enumName
      : `ENUM_${model.toUpperCase()}_${field.toUpperCase()}`;
  },

  /**
   * Remove custom scalar type such as Upload because Apollo automatically adds it in the schema.
   * but we need to add it to print the schema on our side.
   *
   * @return void
   */

  removeCustomScalar(typeDefs, resolvers) {
    delete resolvers.Upload;
    return typeDefs.replace('scalar Upload', '');
  },

  /**
   * Add custom scalar type such as JSON.
   *
   * @return void
   */

  addCustomScalar(resolvers) {
    const scalars = {
      JSON: GraphQLJSON,
      DateTime: GraphQLDateTime,
      Time,
      Date: GraphQLDate,
      Long: GraphQLLong,
      Upload: GraphQLUpload,
    };

    Object.assign(resolvers, scalars);

    return Object.keys(scalars)
      .map(key => `scalar ${key}`)
      .join('\n');
  },

  /**
   * Add Union Type that contains the types defined by the user.
   *
   * @return string
   */

  addPolymorphicUnionType(customDefs, defs) {
    const def = customDefs + defs;
    const types = graphql
      .parse(def)
      .definitions.filter(
        def => def.kind === 'ObjectTypeDefinition' && def.name.value !== 'Query'
      )
      .map(def => def.name.value);

    if (types.length > 0) {
      return {
        polymorphicDef: `union Morph = ${types.join(' | ')}`,
        polymorphicResolver: {
          Morph: {
            __resolveType(obj) {
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

  addInput() {
    return `
      input InputID { id: ID!}
    `;
  },

  generateInputModel(model, name, { allowIds = false } = {}) {
    const globalId = model.globalId;
    const inputName = `${_.upperFirst(toSingular(name))}Input`;

    if (_.isEmpty(model.attributes)) {
      return `
      input ${inputName} {
        _: String
      }

      input edit${inputName} {
        ${allowIds ? 'id: ID' : '_: String'}
      }
     `;
    }

    const inputs = `
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
        ${allowIds ? 'id: ID' : ''}
        ${Object.keys(model.attributes)
          .map(attribute => {
            return `${attribute}: ${this.convertType({
              definition: model.attributes[attribute],
              modelName: globalId,
              attributeName: attribute,
              rootType: 'mutation',
              action: 'update',
            })}`;
          })
          .join('\n')}
      }
    `;
    return inputs;
  },

  generateInputPayloadArguments(model, name, type, resolver) {
    const singularName = toSingular(name);
    if (
      _.get(resolver, `Mutation.${type}${_.upperFirst(singularName)}`) === false
    ) {
      return '';
    }

    const inputName = `${_.upperFirst(singularName)}Input`;
    const payloadName = `${_.upperFirst(singularName)}Payload`;

    switch (type) {
      case 'create':
        return `
          input ${type}${inputName} { data: ${inputName} }
          type ${type}${payloadName} { ${singularName}: ${model.globalId} }
        `;
      case 'update':
        return `
          input ${type}${inputName}  { where: InputID, data: edit${inputName} }
          type ${type}${payloadName} { ${singularName}: ${model.globalId} }
        `;
      case 'delete':
        return `
          input ${type}${inputName}  { where: InputID }
          type ${type}${payloadName} { ${singularName}: ${model.globalId} }
        `;
      default:
      // Nothing
    }
  },
};
