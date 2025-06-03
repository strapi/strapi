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
  uid({ attribute }) {
    const { targetField, options } = attribute;

    // If there are no params to compute, then return the attribute type alone
    if (targetField === undefined && options === undefined) {
      return [withAttributeNamespace('UID')];
    }

    const params = [];

    // If the targetField property is defined, then reference it,
    // otherwise, put `undefined` keyword type node as placeholder
    const targetFieldParam = _.isUndefined(targetField)
      ? factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword)
      : factory.createStringLiteral(targetField);

    params.push(targetFieldParam);

    // If the options property is defined, transform it to
    // a type literal node and add it to the params list
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
  media({ attribute }) {
    const { allowedTypes, multiple } = attribute;

    const params = [];

    const typesParam = allowedTypes
      ? factory.createUnionTypeNode(
          allowedTypes.map((allowedType) => factory.createStringLiteral(allowedType))
        )
      : factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword);

    if (allowedTypes || multiple) {
      params.push(typesParam);
    }

    if (multiple) {
      params.push(factory.createTrue());
    }

    return [withAttributeNamespace('Media'), params];
  },
  relation({ attribute }) {
    const { relation, target } = attribute;

    const isMorphRelation = relation.toLowerCase().includes('morph');

    if (isMorphRelation) {
      return [withAttributeNamespace('Relation'), [factory.createStringLiteral(relation, true)]];
    }

    return [
      withAttributeNamespace('Relation'),
      [factory.createStringLiteral(relation, true), factory.createStringLiteral(target, true)],
    ];
  },
  component({ attribute }) {
    const target = attribute.component;
    const params = [factory.createStringLiteral(target, true)];

    if (attribute.repeatable) {
      params.push(factory.createTrue());
    } else {
      params.push(factory.createFalse());
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
