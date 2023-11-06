'use strict';

const ts = require('typescript');
const _ = require('lodash/fp');

const { toTypeLiteral, withAttributeNamespace } = require('./utils');

const { factory } = ts;

module.exports = {
  string() {
    return [withAttributeNamespace('String')];
  },
  text() {
    return [withAttributeNamespace('Text')];
  },
  richtext() {
    return [withAttributeNamespace('RichText')];
  },
  password() {
    return [withAttributeNamespace('Password')];
  },
  email() {
    return [withAttributeNamespace('Email')];
  },
  date() {
    return [withAttributeNamespace('Date')];
  },
  time() {
    return [withAttributeNamespace('Time')];
  },
  datetime() {
    return [withAttributeNamespace('DateTime')];
  },
  timestamp() {
    return [withAttributeNamespace('Timestamp')];
  },
  integer() {
    return [withAttributeNamespace('Integer')];
  },
  biginteger() {
    return [withAttributeNamespace('BigInteger')];
  },
  float() {
    return [withAttributeNamespace('Float')];
  },
  decimal() {
    return [withAttributeNamespace('Decimal')];
  },
  uid({ attribute, uid }) {
    const { targetField, options } = attribute;

    // If there are no params to compute, then return the attribute type alone
    if (targetField === undefined && options === undefined) {
      return [withAttributeNamespace('UID')];
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

    return [withAttributeNamespace('UID'), params];
  },
  enumeration({ attribute }) {
    const { enum: enumValues } = attribute;

    return [withAttributeNamespace('Enumeration'), [toTypeLiteral(enumValues)]];
  },
  boolean() {
    return [withAttributeNamespace('Boolean')];
  },
  json() {
    return [withAttributeNamespace('JSON')];
  },
  blocks() {
    return [withAttributeNamespace('Blocks')];
  },
  media() {
    return [withAttributeNamespace('Media')];
  },
  relation({ uid, attribute }) {
    const { relation, target } = attribute;

    const isMorphRelation = relation.toLowerCase().includes('morph');

    if (isMorphRelation) {
      return [
        withAttributeNamespace('Relation'),
        [factory.createStringLiteral(uid, true), factory.createStringLiteral(relation, true)],
      ];
    }

    return [
      withAttributeNamespace('Relation'),
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

    return [withAttributeNamespace('Component'), params];
  },
  dynamiczone({ attribute }) {
    const componentsParam = factory.createTupleTypeNode(
      attribute.components.map((component) => factory.createStringLiteral(component))
    );

    return [withAttributeNamespace('DynamicZone'), [componentsParam]];
  },
};
