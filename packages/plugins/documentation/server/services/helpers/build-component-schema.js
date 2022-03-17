'use strict';

const cleanSchemaAttributes = require('./utils/clean-schema-attributes');
const getSchemaData = require('./utils/get-schema-data');
const loopContentTypeNames = require('./utils/loop-content-type-names');
const pascalCase = require('./utils/pascal-case');

/**
 * @decription Gets all open api schema objects for a given content type
 *
 * @param {object} apiInfo
 * @property {string} apiInfo.getter - api | plugin
 * @property {array} apiInfo.ctNames - All contentType names on the api
 * @property {string} apiInfo.uniqueName - Api name | Api name + Content type name
 * @property {object} apiInfo.attributes - Attributes on content type
 * @property {object} apiInfo.routeInfo - The routes for the api
 *
 * @returns {object} Open API schemas
 */
const getAllSchemasForContentType = ({ routeInfo, attributes, uniqueName, ctNames, getter }) => {
  // Store response and request schemas in an object
  let schemas = {};
  // Set flag false since schemas are always objects
  const isListOfEntities = false;
  // Get all the route methods
  const routeMethods = routeInfo.routes.map(route => route.method);

  if (!ctNames.length && getter === 'plugin') {
    // Set arbitrary attributes
    const attributes = { foo: { type: 'string' } };

    schemas = {
      ...schemas,
      [pascalCase(uniqueName)]: getSchemaData(isListOfEntities, cleanSchemaAttributes(attributes)),
    };
  }

  if (routeMethods.includes('POST') || routeMethods.includes('PUT')) {
    const requiredAttributes = Object.entries(attributes)
      .filter(([, attribute]) => attribute.required)
      .map(([attributeName, attribute]) => {
        return { [attributeName]: attribute };
      });

    const requestAttributes =
      routeMethods.includes('POST') && requiredAttributes.length
        ? Object.assign({}, ...requiredAttributes)
        : attributes;

    schemas = {
      ...schemas,
      [`New${pascalCase(uniqueName)}`]: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: cleanSchemaAttributes(requestAttributes, { isRequest: true }),
          },
        },
      },
    };
  }

  schemas = {
    ...schemas,
    [pascalCase(uniqueName)]: getSchemaData(isListOfEntities, cleanSchemaAttributes(attributes)),
  };

  return schemas;
};

const buildComponentSchema = api => {
  return loopContentTypeNames(api, getAllSchemasForContentType);
};

module.exports = buildComponentSchema;
