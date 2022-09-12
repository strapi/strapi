'use strict';

const ts = require('typescript');
const _ = require('lodash/fp');

const { toTypeLiteral } = require('./utils');

const { factory } = ts;

module.exports = {
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

    return ['EnumerationAttribute', [toTypeLiteral(enumValues)]];
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
      attribute.components.map((component) => factory.createStringLiteral(component))
    );

    return ['DynamicZoneAttribute', [componentsParam]];
  },
};
