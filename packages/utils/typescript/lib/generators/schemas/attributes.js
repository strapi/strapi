'use strict';

const ts = require('typescript');
const { factory } = require('typescript');
const _ = require('lodash/fp');

const { addImport } = require('./imports');
const { getTypeNode, toTypeLiteral } = require('./utils');

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
  uid({ attribute, uid }) {
    const { targetField, options } = attribute;

    // If there are no params to compute, then return the attribute type alone
    if (targetField === undefined && options === undefined) {
      return ['UIDAttribute'];
    }

    const params = [];

    // If the targetField property is defined, then reference it,
    // otherwise, put `undefined` keyword type nodes as placeholders
    const targetFieldParams = _.isUndefined(targetField)
      ? [
          factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
          factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
        ]
      : [factory.createStringLiteral(uid), factory.createStringLiteral(targetField)];

    params.push(...targetFieldParams);

    // If the options property is defined, transform it to
    // a type literral node and add it to the params list
    if (_.isObject(options)) {
      params.push(toTypeLiteral(options));
    }

    return ['UIDAttribute', params];
  },
  enumeration({ attribute }) {
    const { enum: enumValues } = attribute;

    if (Array.isArray(enumValues)) {
      return ['EnumerationAttribute', [toTypeLiteral(enumValues)]];
    }

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
  relation({ uid, attribute }) {
    const { relation, target } = attribute;

    const isMorphRelation = relation.toLowerCase().includes('morph');

    if (isMorphRelation) {
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
  component({ attribute }) {
    const target = attribute.component;
    const params = [factory.createStringLiteral(target, true)];

    if (attribute.repeatable) {
      params.push(factory.createTrue());
    }

    return ['ComponentAttribute', params];
  },
  dynamiczone({ attribute }) {
    const componentsParam = factory.createTupleTypeNode(
      attribute.components.map(component => factory.createStringLiteral(component))
    );

    return ['DynamicZoneAttribute', [componentsParam]];
  },
};

module.exports = attributeToPropertySignature;

module.exports.mappers = mappers;
module.exports.getAttributeType = getAttributeType;
module.exports.getAttributeModifiers = getAttributeModifiers;
