'use strict';

const { factory } = require('typescript');
const _ = require('lodash/fp');

const { addImport } = require('./imports');
const { getTypeNode, toTypeLiteral } = require('./utils');
const mappers = require('./mappers');

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

  addImport(attributeType);

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
    addImport('RequiredAttribute');

    modifiers.push(factory.createTypeReferenceNode(factory.createIdentifier('RequiredAttribute')));
  }

  // Private
  if (attribute.private) {
    addImport('PrivateAttribute');

    modifiers.push(factory.createTypeReferenceNode(factory.createIdentifier('PrivateAttribute')));
  }

  // Unique
  if (attribute.unique) {
    addImport('UniqueAttribute');

    modifiers.push(factory.createTypeReferenceNode(factory.createIdentifier('UniqueAttribute')));
  }

  // Configurable
  if (attribute.configurable) {
    addImport('ConfigurableAttribute');

    modifiers.push(
      factory.createTypeReferenceNode(factory.createIdentifier('ConfigurableAttribute'))
    );
  }

  // Custom field
  if (attribute.customField) {
    addImport('CustomField');

    const customFieldUid = factory.createStringLiteral(attribute.customField);
    const typeParams = [customFieldUid];

    if (attribute.options) {
      typeParams.push(toTypeLiteral(attribute.options));
    }

    modifiers.push(
      factory.createTypeReferenceNode(factory.createIdentifier('CustomField'), typeParams)
    );
  }

  // Plugin Options
  if (!_.isEmpty(attribute.pluginOptions)) {
    addImport('SetPluginOptions');

    modifiers.push(
      factory.createTypeReferenceNode(
        factory.createIdentifier('SetPluginOptions'),
        // Transform the pluginOptions object into an object literal expression
        [toTypeLiteral(attribute.pluginOptions)]
      )
    );
  }

  // Min / Max
  // TODO: Always provide a second type argument for min/max (ie: resolve the attribute scalar type with a `GetAttributeType<${mappers[attribute][0]}>` (useful for biginter (string values)))
  if (!_.isNil(attribute.min) || !_.isNil(attribute.max)) {
    addImport('SetMinMax');

    const minMaxProperties = _.pick(['min', 'max'], attribute);

    modifiers.push(
      factory.createTypeReferenceNode(factory.createIdentifier('SetMinMax'), [
        toTypeLiteral(minMaxProperties),
      ])
    );
  }

  // Min length / Max length
  if (!_.isNil(attribute.minLength) || !_.isNil(attribute.maxLength)) {
    addImport('SetMinMaxLength');

    const minMaxProperties = _.pick(['minLength', 'maxLength'], attribute);

    modifiers.push(
      factory.createTypeReferenceNode(factory.createIdentifier('SetMinMaxLength'), [
        toTypeLiteral(minMaxProperties),
      ])
    );
  }

  // Default
  if (!_.isNil(attribute.default)) {
    addImport('DefaultTo');

    const defaultLiteral = toTypeLiteral(attribute.default);

    modifiers.push(
      factory.createTypeReferenceNode(factory.createIdentifier('DefaultTo'), [defaultLiteral])
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
