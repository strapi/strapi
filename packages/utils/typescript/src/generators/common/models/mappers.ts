import * as ts from 'typescript';
import _ from 'lodash/fp';

import { toTypeLiteral, withAttributeNamespace } from './utils';
import type { Attribute } from './utils';

const { factory } = ts;

export interface MapperContext {
  uid?: string;
  attribute: Attribute;
  attributeName?: string;
}

export type Mapper = (context: MapperContext) => [string] | [string, any[]];

function string(): [string] {
  return [withAttributeNamespace('String')];
}

function text(): [string] {
  return [withAttributeNamespace('Text')];
}

function richtext(): [string] {
  return [withAttributeNamespace('RichText')];
}

function password(): [string] {
  return [withAttributeNamespace('Password')];
}

function email(): [string] {
  return [withAttributeNamespace('Email')];
}

function date(): [string] {
  return [withAttributeNamespace('Date')];
}

function time(): [string] {
  return [withAttributeNamespace('Time')];
}

function datetime(): [string] {
  return [withAttributeNamespace('DateTime')];
}

function timestamp(): [string] {
  return [withAttributeNamespace('Timestamp')];
}

function integer(): [string] {
  return [withAttributeNamespace('Integer')];
}

function biginteger(): [string] {
  return [withAttributeNamespace('BigInteger')];
}

function float(): [string] {
  return [withAttributeNamespace('Float')];
}

function decimal(): [string] {
  return [withAttributeNamespace('Decimal')];
}

function uid({ attribute }: MapperContext): [string] | [string, any[]] {
  const { targetField, options } = attribute;

  // If there are no params to compute, then return the attribute type alone
  if (targetField === undefined && options === undefined) {
    return [withAttributeNamespace('UID')];
  }

  const params: any[] = [];

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

function enumeration({ attribute }: MapperContext): [string, any[]] {
  const { enum: enumValues } = attribute;

  return [withAttributeNamespace('Enumeration'), [toTypeLiteral(enumValues)]];
}

function boolean(): [string] {
  return [withAttributeNamespace('Boolean')];
}

function json(): [string] {
  return [withAttributeNamespace('JSON')];
}

function blocks(): [string] {
  return [withAttributeNamespace('Blocks')];
}

function media({ attribute }: MapperContext): [string, any[]] {
  const { allowedTypes, multiple } = attribute;

  const params: any[] = [];

  const typesParam = allowedTypes
    ? factory.createUnionTypeNode(
        allowedTypes.map((allowedType: string) => factory.createStringLiteral(allowedType))
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

function relation({ attribute }: MapperContext): [string, any[]] {
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

function component({ attribute }: MapperContext): [string, any[]] {
  const target = attribute.component;
  const params = [factory.createStringLiteral(target, true)];

  if (attribute.repeatable) {
    params.push(factory.createTrue() as any);
  } else {
    params.push(factory.createFalse() as any);
  }

  return [withAttributeNamespace('Component'), params];
}

function dynamiczone({ attribute }: MapperContext): [string, any[]] {
  const componentsParam = factory.createTupleTypeNode(
    attribute.components.map((c: string) => factory.createStringLiteral(c))
  );

  return [withAttributeNamespace('DynamicZone'), [componentsParam]];
}

export const mappers: Record<string, Mapper> = {
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
