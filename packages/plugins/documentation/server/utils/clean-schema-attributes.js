'use strict';

const _ = require('lodash');
const getSchemaData = require('./get-schema-data');

/**
 * @description - Converts types found on attributes to OpenAPI specific data types
 * 
 * @param {object} attributes - The attributes found on a contentType
 
 * @returns Attributes using OpenAPI acceptable data types
 */

const cleanSchemaAttributes = (attributes, typeMap = new Map()) => {
  const attributesCopy = _.cloneDeep(attributes);

  for (const prop in attributesCopy) {
    const attribute = attributesCopy[prop];
    if (attribute.default) {
      delete attributesCopy[prop].default;
    }

    switch (attribute.type) {
      case 'password':
      case 'email':
      case 'date':
      case 'text':
      case 'datetime': {
        attributesCopy[prop] = { type: 'string' };
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
      case 'json': {
        attributesCopy[prop] = {};
        break;
      }
      case 'uid': {
        attributesCopy[prop] = { type: 'string', format: 'uuid' };
        break;
      }
      case 'media': {
        const imageAttributes = strapi.plugin('upload').contentType('file').attributes;
        const isListOfEntities = attribute.multiple;

        attributesCopy[prop] = {
          type: 'object',
          properties: {
            data: getSchemaData(isListOfEntities, cleanSchemaAttributes(imageAttributes)),
          },
        };
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
                id: { type: 'string' },
                ...cleanSchemaAttributes(componentAttributes),
              },
            },
          };
        } else {
          attributesCopy[prop] = {
            type: 'object',
            properties: {
              id: { type: 'string' },
              ...cleanSchemaAttributes(componentAttributes),
            },
          };
        }
        break;
      }
      case 'relation': {
        const isListOfEntities = attribute.relation.includes('ToMany');
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
            data: getSchemaData(isListOfEntities, cleanSchemaAttributes(targetAttributes, typeMap)),
          },
        };

        break;
      }
      case 'dynamiczone': {
        const components = attribute.components.map(component => {
          const componentAttributes = strapi.components[component].attributes;
          return {
            type: 'object',
            properties: {
              __component: { type: 'string' },
              ...cleanSchemaAttributes(componentAttributes),
            },
          };
        });

        attributesCopy[prop] = {
          type: 'array',
          items: {
            anyOf: components,
          },
        };
      }
    }
  }

  return attributesCopy;
};

module.exports = cleanSchemaAttributes;
