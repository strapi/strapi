'use strict';

const ts = require('typescript');
const _ = require('lodash/fp');

const { toTypeLiteral, withAttributeNamespace } = require('./utils');

const { factory } = ts;

function string() {
  return [withAttributeNamespace('String')];
}

function text() {
  return [withAttributeNamespace('Text')];
}

function richtext() {
  return [withAttributeNamespace('RichText')];
}

function password() {
  return [withAttributeNamespace('Password')];
}

function email() {
  return [withAttributeNamespace('Email')];
}

function date() {
  return [withAttributeNamespace('Date')];
}

function time() {
  return [withAttributeNamespace('Time')];
}

function datetime() {
  return [withAttributeNamespace('DateTime')];
}

function timestamp() {
  return [withAttributeNamespace('Timestamp')];
}

function integer() {
  return [withAttributeNamespace('Integer')];
}

function biginteger() {
  return [withAttributeNamespace('BigInteger')];
}

function float() {
  return [withAttributeNamespace('Float')];
}

function decimal() {
  return [withAttributeNamespace('Decimal')];
}

function uid({ attribute }) {
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
}

function enumeration({ attribute }) {
  const { enum: enumValues } = attribute;

  return [withAttributeNamespace('Enumeration'), [toTypeLiteral(enumValues)]];
}

function boolean() {
  return [withAttributeNamespace('Boolean')];
}

function json() {
  return [withAttributeNamespace('JSON')];
}

function blocks() {
  return [withAttributeNamespace('Blocks')];
}

function media({ attribute }) {
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
}

function relation({ attribute }) {
  const { relation: relationType, target } = attribute;

  const isMorphRelation = relationType.toLowerCase().includes('morph');

  if (isMorphRelation) {
    return [withAttributeNamespace('Relation'), [factory.createStringLiteral(relationType, true)]];
  }

  return [
    withAttributeNamespace('Relation'),
    [factory.createStringLiteral(relationType, true), factory.createStringLiteral(target, true)],
  ];
}

function component({ attribute }) {
  const target = attribute.component;
  const params = [factory.createStringLiteral(target, true)];

  if (attribute.repeatable) {
    params.push(factory.createTrue());
  } else {
    params.push(factory.createFalse());
  }

  return [withAttributeNamespace('Component'), params];
}

function dynamiczone({ attribute }) {
  const componentsParam = factory.createTupleTypeNode(
    attribute.components.map((c) => factory.createStringLiteral(c))
  );

  return [withAttributeNamespace('DynamicZone'), [componentsParam]];
}

module.exports = {
  string,
  text,
  richtext,
  password,
  email,
  date,
  time,
  datetime,
  timestamp,
  integer,
  biginteger,
  float,
  decimal,
  uid,
  enumeration,
  boolean,
  json,
  blocks,
  media,
  relation,
  component,
  dynamiczone,
};
