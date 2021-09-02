'use strict';

const _ = require('lodash');
const getSchemaData = require('./get-schema-data');

/**
 * @description - Converts types found on attributes to OpenAPI specific data types
 * 
 * @param {object} attributes - The attributes found on a contentType
 
 * @returns Attributes using OpenAPI acceptable data types
 */

const cleanSchemaAttributes = attributes => {
  const attributesCopy = _.cloneDeep(attributes);

  for (const prop in attributesCopy) {
    const attribute = attributesCopy[prop];
    if (attribute.default) {
      delete attributesCopy[prop].default;
    }

    switch (attribute.type) {
      case 'datetime': {
        attributesCopy[prop] = { type: 'string' };
        break;
      }
      case 'decimal': {
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
        const isListOfEntities = attribute.repeatable;

        attributesCopy[prop] = {
          type: 'object',
          properties: {
            data: getSchemaData(isListOfEntities, cleanSchemaAttributes(componentAttributes)),
          },
        };
        break;
      }
      case 'relation': {
        // TODO: Sanitize relation attributes and list them in the schema
        const isListOfEntities = attribute.relation.includes('ToMany');
        attributesCopy[prop] = {
          type: 'object',
          properties: {
            data: getSchemaData(isListOfEntities, {}),
          },
        };

        break;
      }
    }
  }

  return attributesCopy;
};

module.exports = cleanSchemaAttributes;
