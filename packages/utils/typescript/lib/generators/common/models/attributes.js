'use strict';

const ts = require('typescript');
const _ = require('lodash/fp');

const { addImport } = require('../imports');
const { getTypeNode, toTypeLiteral, withAttributeNamespace, NAMESPACES } = require('./utils');
const mappers = require('./mappers');

const { factory } = ts;

/**
 * Create the base type node for a given attribute
 *
 * @param {string} attributeName
 * @param {object} attribute
 * @param {string} uid
 * @returns {object}
 */
const getAttributeType = (attributeName, attribute, uid) => {
  if (!Object.keys(mappers).includes(attribute.type)) {
    console.warn(
      `"${attributeName}" attribute from "${uid}" has an invalid type: "${attribute.type}"`
    );

    return null;
  }

  const [attributeType, typeParams] = mappers[attribute.type]({ uid, attribute, attributeName });

  // Make sure the attribute namespace is imported
  addImport(NAMESPACES.attribute);

  return getTypeNode(attributeType, typeParams);
};

/**
 * Collect every modifier node from an attribute
 *
 * @param {object} attribute
 * @returns {object[]}
 */
const getAttributeModifiers = (attribute) => {
  const modifiers = [];

  // Required
  if (attribute.required) {
    modifiers.push(
      factory.createTypeReferenceNode(factory.createIdentifier(withAttributeNamespace('Required')))
    );
  }

  // Private
  if (attribute.private) {
    modifiers.push(
      factory.createTypeReferenceNode(factory.createIdentifier(withAttributeNamespace('Private')))
    );
  }

  // Unique
  if (attribute.unique) {
    modifiers.push(
      factory.createTypeReferenceNode(factory.createIdentifier(withAttributeNamespace('Unique')))
    );
  }

  // Configurable
  if (attribute.configurable) {
    modifiers.push(
      factory.createTypeReferenceNode(
        factory.createIdentifier(withAttributeNamespace('Configurable'))
      )
    );
  }

  // Custom field
  if (attribute.customField) {
    const customFieldUid = factory.createStringLiteral(attribute.customField);
    const typeArguments = [customFieldUid];

    if (attribute.options) {
      typeArguments.push(toTypeLiteral(attribute.options));
    }

    modifiers.push(
      factory.createTypeReferenceNode(
        factory.createIdentifier(withAttributeNamespace('CustomField')),
        typeArguments
      )
    );
  }

  // Plugin Options
  if (!_.isEmpty(attribute.pluginOptions)) {
    modifiers.push(
      factory.createTypeReferenceNode(
        factory.createIdentifier(withAttributeNamespace('SetPluginOptions')),
        // Transform the pluginOptions object into an object literal expression
        [toTypeLiteral(attribute.pluginOptions)]
      )
    );
  }

  // Min / Max
  if (!_.isNil(attribute.min) || !_.isNil(attribute.max)) {
    const minMaxProperties = _.pick(['min', 'max'], attribute);
    const { min, max } = minMaxProperties;

    const typeofMin = typeof min;
    const typeofMax = typeof max;

    // Throws error if min/max exist but have different types to prevent unexpected behavior
    if (min !== undefined && max !== undefined && typeofMin !== typeofMax) {
      throw new Error('typeof min/max values mismatch');
    }

    let typeKeyword;

    // use 'string'
    if (typeofMin === 'string' || typeofMax === 'string') {
      typeKeyword = ts.SyntaxKind.StringKeyword;
    }
    // use 'number'
    else if (typeofMin === 'number' || typeofMax === 'number') {
      typeKeyword = ts.SyntaxKind.NumberKeyword;
    }
    // invalid type
    else {
      throw new Error(
        `Invalid data type for min/max options. Must be string, number or undefined, but found { min: ${min} (${typeofMin}), max: ${max} (${typeofMax}) }`
      );
    }

    modifiers.push(
      factory.createTypeReferenceNode(
        factory.createIdentifier(withAttributeNamespace('SetMinMax')),
        [toTypeLiteral(minMaxProperties), factory.createKeywordTypeNode(typeKeyword)]
      )
    );
  }

  // Min length / Max length
  if (!_.isNil(attribute.minLength) || !_.isNil(attribute.maxLength)) {
    const minMaxProperties = _.pick(['minLength', 'maxLength'], attribute);

    modifiers.push(
      factory.createTypeReferenceNode(
        factory.createIdentifier(withAttributeNamespace('SetMinMaxLength')),
        [toTypeLiteral(minMaxProperties)]
      )
    );
  }

  // Default
  if (!_.isNil(attribute.default)) {
    const defaultLiteral = toTypeLiteral(attribute.default);

    modifiers.push(
      factory.createTypeReferenceNode(
        factory.createIdentifier(withAttributeNamespace('DefaultTo')),
        [defaultLiteral]
      )
    );
  }

  return modifiers;
};

/**
 * Generate a property signature node for a given attribute
 *
 * @param {object} schema
 * @param {string} attributeName
 * @param {object} attribute
 * @returns {object}
 */
const attributeToPropertySignature = (schema, attributeName, attribute) => {
  const baseType = getAttributeType(attributeName, attribute, schema.uid);

  if (baseType === null) {
    return null;
  }

  const modifiers = getAttributeModifiers(attribute);

  const nodes = [baseType, ...modifiers];

  return factory.createPropertySignature(
    undefined,
    factory.createIdentifier(attributeName),
    undefined,
    factory.createIntersectionTypeNode(nodes)
  );
};

module.exports = attributeToPropertySignature;

module.exports.mappers = mappers;
module.exports.getAttributeType = getAttributeType;
module.exports.getAttributeModifiers = getAttributeModifiers;
