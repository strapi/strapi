'use strict';

const { factory } = require('typescript');
const fp = require('lodash/fp');

const { addImport } = require('./imports');
const { getTypeNode, toTypeLitteral } = require('./utils');

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
  const modifiers = getAttributeModifiers(attributeName, attribute);

  const nodes = [baseType, ...modifiers];

  return factory.createPropertySignature(
    undefined,
    factory.createIdentifier(attributeName),
    undefined,
    factory.createIntersectionTypeNode(nodes)
  );
};

/**
 * Create the base type node for a given attribute
 *
 * @param {string} attributeName
 * @param {object} attribute
 * @param {string} uid
 * @returns {object}
 */
const getAttributeType = (attributeName, attribute, uid) => {
  const mappers = {
    string() {
      return ['StringAttribute'];
    },
    text() {
      return ['TextAttribute'];
    },
    richtext() {
      return ['RichTextAttribute'];
    },
    password() {
      return ['PasswordAttribute'];
    },
    email() {
      return ['EmailAttribute'];
    },
    date() {
      return ['DateAttribute'];
    },
    time() {
      return ['TimeAttribute'];
    },
    datetime() {
      return ['DateTimeAttribute'];
    },
    timestamp() {
      return ['TimestampAttribute'];
    },
    integer() {
      return ['IntegerAttribute'];
    },
    biginteger() {
      return ['BigIntegerAttribute'];
    },
    float() {
      return ['FloatAttribute'];
    },
    decimal() {
      return ['DecimalAttribute'];
    },
    uid() {
      return ['UIDAttribute'];
    },
    enumeration() {
      return ['EnumerationAttribute'];
    },
    boolean() {
      return ['BooleanAttribute'];
    },
    json() {
      return ['JSONAttribute'];
    },
    media() {
      return ['MediaAttribute'];
    },
    relation() {
      const { relation, target } = attribute;

      if (relation.includes('morph') | relation.includes('Morph')) {
        return [
          'RelationAttribute',
          [factory.createStringLiteral(uid, true), factory.createStringLiteral(relation, true)],
        ];
      }

      return [
        'RelationAttribute',
        [
          factory.createStringLiteral(uid, true),
          factory.createStringLiteral(relation, true),
          factory.createStringLiteral(target, true),
        ],
      ];
    },
    component() {
      const target = attribute.component;
      const params = [factory.createStringLiteral(target, true)];

      if (attribute.repeatable) {
        params.push(factory.createTrue());
      }

      return ['ComponentAttribute', params];
    },
    dynamiczone() {
      const componentsParam = factory.createTupleTypeNode(
        attribute.components.map(component => factory.createStringLiteral(component))
      );

      return ['DynamicZoneAttribute', [componentsParam]];
    },
  };

  if (!Object.keys(mappers).includes(attribute.type)) {
    console.warning(
      `"${attributeName}" attribute from "${uid}" has an invalid type: "${attribute.type}"`
    );

    return null;
  }

  const [attributeType, typeParams] = mappers[attribute.type]();

  addImport(attributeType);

  return getTypeNode(attributeType, typeParams);
};

/**
 * Collect every modifier node from an attribute
 *
 * @param {string} _attributeName
 * @param {object} attribute
 * @returns {object[]}
 */
const getAttributeModifiers = (_attributeName, attribute) => {
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

  // Plugin Options
  if (!fp.isEmpty(attribute.pluginOptions)) {
    addImport('SetPluginOptions');

    modifiers.push(
      factory.createTypeReferenceNode(
        factory.createIdentifier('SetPluginOptions'),
        // Transform the pluginOptions object into an object litteral expression
        [toTypeLitteral(attribute.pluginOptions)]
      )
    );
  }

  // Min / Max
  if (!fp.isNil(attribute.min) || !fp.isNil(attribute.max)) {
    addImport('SetMinMax');

    const minMaxProperties = fp.pick(['min', 'max'], attribute);

    modifiers.push(
      factory.createTypeReferenceNode(factory.createIdentifier('SetMinMax'), [
        toTypeLitteral(minMaxProperties),
      ])
    );
  }

  // Min length / Max length
  if (!fp.isNil(attribute.minLength) || !fp.isNil(attribute.maxLength)) {
    addImport('SetMinMaxLength');

    const minMaxProperties = fp.pick(['minLength', 'maxLength'], attribute);

    modifiers.push(
      factory.createTypeReferenceNode(factory.createIdentifier('SetMinMaxLength'), [
        toTypeLitteral(minMaxProperties),
      ])
    );
  }

  // Default
  if (!fp.isNil(attribute.default)) {
    addImport('DefaultTo');

    const defaultLitteral = toTypeLitteral(attribute.default);

    modifiers.push(
      factory.createTypeReferenceNode(factory.createIdentifier('DefaultTo'), [defaultLitteral])
    );
  }

  return modifiers;
};

module.exports = attributeToPropertySignature;
