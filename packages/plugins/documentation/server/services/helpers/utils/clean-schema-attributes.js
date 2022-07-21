'use strict';

const _ = require('lodash');
const getSchemaData = require('./get-schema-data');

/**
 * @description - Converts types found on attributes to OpenAPI acceptable data types
 *
 * @param {object} attributes - The attributes found on a contentType
 * @param {{ typeMap: Map, isRequest: boolean }} opts
 * @returns Attributes using OpenAPI acceptable data types
 */
const cleanSchemaAttributes = (attributes, { typeMap = new Map(), isRequest = false } = {}) => {
  const attributesCopy = _.cloneDeep(attributes);

  for (const prop in attributesCopy) {
    const attribute = attributesCopy[prop];
    if (attribute.default) {
      delete attributesCopy[prop].default;
    }

    if (attribute.type === 'customField') {
      const customField = strapi.container.get('custom-fields').get(attribute.customField);
      attribute.type = customField.type;
    }

    switch (attribute.type) {
      case 'password': {
        if (!isRequest) {
          delete attributesCopy[prop];
          break;
        }

        attributesCopy[prop] = { type: 'string', format: 'password', example: '*******' };
        break;
      }
      case 'email': {
        attributesCopy[prop] = { type: 'string', format: 'email' };
        break;
      }
      case 'string':
      case 'text':
      case 'richtext': {
        attributesCopy[prop] = { type: 'string' };
        break;
      }
      case 'timestamp': {
        attributesCopy[prop] = { type: 'string', format: 'timestamp', example: Date.now() };
        break;
      }
      case 'time': {
        attributesCopy[prop] = { type: 'string', format: 'time', example: '12:54.000' };
        break;
      }
      case 'date': {
        attributesCopy[prop] = { type: 'string', format: 'date' };
        break;
      }
      case 'datetime': {
        attributesCopy[prop] = { type: 'string', format: 'date-time' };
        break;
      }
      case 'boolean': {
        attributesCopy[prop] = { type: 'boolean' };
        break;
      }
      case 'enumeration': {
        attributesCopy[prop] = { type: 'string', enum: attribute.enum };
        break;
      }
      case 'decimal':
      case 'float': {
        attributesCopy[prop] = { type: 'number', format: 'float' };
        break;
      }
      case 'integer': {
        attributesCopy[prop] = { type: 'integer' };
        break;
      }
      case 'biginteger': {
        attributesCopy[prop] = { type: 'string', pattern: '^\\d*$', example: '123456789' };
        break;
      }
      case 'json': {
        attributesCopy[prop] = {};
        break;
      }
      case 'uid': {
        attributesCopy[prop] = { type: 'string' };
        break;
      }
      case 'component': {
        const componentAttributes = strapi.components[attribute.component].attributes;

        if (attribute.repeatable) {
          attributesCopy[prop] = {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                ...(isRequest ? {} : { id: { type: 'string' } }),
                ...cleanSchemaAttributes(componentAttributes, { typeMap, isRequest }),
              },
            },
          };
        } else {
          attributesCopy[prop] = {
            type: 'object',
            properties: {
              ...(isRequest ? {} : { id: { type: 'string' } }),
              ...cleanSchemaAttributes(componentAttributes, {
                typeMap,
                isRequest,
              }),
            },
          };
        }
        break;
      }
      case 'dynamiczone': {
        const components = attribute.components.map(component => {
          const componentAttributes = strapi.components[component].attributes;
          return {
            type: 'object',
            properties: {
              ...(isRequest ? {} : { id: { type: 'string' } }),
              __component: { type: 'string' },
              ...cleanSchemaAttributes(componentAttributes, { typeMap, isRequest }),
            },
          };
        });

        attributesCopy[prop] = {
          type: 'array',
          items: {
            anyOf: components,
          },
        };
        break;
      }
      case 'media': {
        const imageAttributes = strapi.contentType('plugin::upload.file').attributes;
        const isListOfEntities = attribute.multiple;

        if (isRequest) {
          const oneOfType = {
            oneOf: [{ type: 'integer' }, { type: 'string' }],
            example: 'string or id',
          };

          attributesCopy[prop] = isListOfEntities ? { type: 'array', items: oneOfType } : oneOfType;
          break;
        }

        attributesCopy[prop] = {
          type: 'object',
          properties: {
            data: getSchemaData(isListOfEntities, cleanSchemaAttributes(imageAttributes)),
          },
        };
        break;
      }

      case 'relation': {
        const isListOfEntities = attribute.relation.includes('ToMany');

        if (isRequest) {
          const oneOfType = {
            oneOf: [{ type: 'integer' }, { type: 'string' }],
            example: 'string or id',
          };

          attributesCopy[prop] = isListOfEntities ? { type: 'array', items: oneOfType } : oneOfType;
          break;
        }

        if (prop === 'localizations') {
          attributesCopy[prop] = {
            type: 'array',
            items: { type: 'object', properties: {} },
          };
          break;
        }

        if (!attribute.target || typeMap.has(attribute.target)) {
          attributesCopy[prop] = {
            type: 'object',
            properties: { data: getSchemaData(isListOfEntities, {}) },
          };
          break;
        }

        typeMap.set(attribute.target, true);
        const targetAttributes = strapi.contentType(attribute.target).attributes;

        attributesCopy[prop] = {
          type: 'object',
          properties: {
            data: getSchemaData(
              isListOfEntities,
              cleanSchemaAttributes(targetAttributes, { typeMap, isRequest })
            ),
          },
        };

        break;
      }
      default: {
        throw new Error(`Invalid type ${attribute.type} while generating open api schema.`);
      }
    }
  }

  return attributesCopy;
};

module.exports = cleanSchemaAttributes;
