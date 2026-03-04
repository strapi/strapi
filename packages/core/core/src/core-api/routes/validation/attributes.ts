/**
 * @file This module provides a set of functions to convert Strapi schema attributes into Zod schemas.
 * It handles various attribute types, including primitive types, components, dynamic zones, media, and relations.
 * The module also provides functions to create input schemas for these attributes, which are used for validation
 * of incoming data.
 */

import { type Schema, UID } from '@strapi/types';

import {
  relations,
  maybeRequired,
  maybeReadonly,
  maybeWithDefault,
  maybeWithMinMax,
  augmentSchema,
} from '@strapi/utils';
import { z } from 'zod/v4';

import { BOOLEAN_LITERAL_VALUES } from './constants';

// eslint-disable-next-line import/no-cycle
import { CoreComponentRouteValidator } from './component';
import { CoreContentTypeRouteValidator } from './content-type';

import { safeSchemaCreation } from './utils';

/**
 * Converts a BigInteger attribute to a Zod schema.
 * @param attribute - The BigInteger attribute object from the Strapi schema.
 * @returns A Zod schema representing the BigInteger field.
 */
export const bigIntegerToSchema = (attribute: Schema.Attribute.BigInteger): z.Schema => {
  const { writable, required, min, max, default: defaultValue } = attribute;

  const schema = augmentSchema(z.string(), [
    (schema) => (min !== undefined ? schema.min(min as unknown as number) : schema),
    (schema) => (max !== undefined ? schema.max(max as unknown as number) : schema),
    maybeRequired(required),
    maybeWithDefault(defaultValue),
    maybeReadonly(writable),
  ]);

  return schema.describe('A biginteger field');
};

/**
 * Converts a blocks attribute to a Zod schema.
 * @returns A Zod schema representing the blocks field.
 */
export const blocksToSchema = (): z.Schema => {
  return z.array(z.any()).describe('A blocks field');
};

/**
 * Converts a boolean attribute to a Zod schema.
 * @param attribute - The Boolean attribute object from the Strapi schema.
 * @returns A Zod schema representing the boolean field.
 */
export const booleanToSchema = (attribute: Schema.Attribute.Boolean): z.Schema => {
  const { writable, required, default: defaultValue } = attribute;

  const schema = augmentSchema(z.boolean().nullable(), [
    maybeRequired(required),
    maybeWithDefault(defaultValue),
    maybeReadonly(writable),
  ]);

  return schema.describe('A boolean field');
};

/**
 * Converts a component attribute to a Zod schema.
 * @param attribute - The Component attribute object from the Strapi schema.
 * @returns A Zod schema representing the component field.
 */
export const componentToSchema = (
  attribute: Schema.Attribute.Component<UID.Component, boolean>
): z.Schema => {
  const { writable, required, min, max, component, repeatable } = attribute;

  const componentSchema = safeSchemaCreation(
    component,
    () => new CoreComponentRouteValidator(strapi, component).entry
  ) as z.ZodType;

  const baseSchema = repeatable ? z.array(componentSchema) : componentSchema;

  const schema = augmentSchema(baseSchema, [
    (schema) => (min !== undefined && schema instanceof z.ZodArray ? schema.min(min) : schema),
    (schema) => (max !== undefined && schema instanceof z.ZodArray ? schema.max(max) : schema),
    maybeRequired(required),
    maybeReadonly(writable),
  ]);

  return schema.describe('A component field');
};

/**
 * Converts a date attribute to a Zod schema.
 * @param attribute - The Date attribute object from the Strapi schema.
 * @returns A Zod schema representing the date field.
 */
export const dateToSchema = (attribute: Schema.Attribute.Date): z.Schema => {
  const { writable, required, default: defaultValue } = attribute;

  const schema = augmentSchema(z.string(), [
    maybeRequired(required),
    maybeWithDefault(defaultValue),
    maybeReadonly(writable),
  ]);

  return schema.describe('A date field');
};

/**
 * Converts a datetime attribute to a Zod schema.
 * @param attribute - The DateTime attribute object from the Strapi schema.
 * @returns A Zod schema representing the datetime field.
 */
export const datetimeToSchema = (attribute: Schema.Attribute.DateTime): z.Schema => {
  const { writable, required, default: defaultValue } = attribute;

  const schema = augmentSchema(z.string(), [
    maybeRequired(required),
    maybeWithDefault(defaultValue),
    maybeReadonly(writable),
  ]);

  return schema.describe('A datetime field');
};

/**
 * Converts a decimal attribute to a Zod schema.
 * @param attribute - The Decimal attribute object from the Strapi schema.
 * @returns A Zod schema representing the decimal field.
 */
export const decimalToSchema = (attribute: Schema.Attribute.Decimal): z.Schema => {
  const { writable, required, min, max, default: defaultValue } = attribute;

  const schema = augmentSchema(z.number(), [
    maybeWithMinMax(min, max),
    maybeRequired(required),
    maybeWithDefault(defaultValue),
    maybeReadonly(writable),
  ]);

  return schema.describe('A decimal field');
};

/**
 * Converts a dynamic zone attribute to a Zod schema.
 * @param attribute - The DynamicZone attribute object from the Strapi schema.
 * @returns A Zod schema representing the dynamic zone field.
 */
export const dynamicZoneToSchema = (attribute: Schema.Attribute.DynamicZone): z.Schema => {
  const { writable, required, min, max } = attribute;

  const baseSchema = z.array(z.any());

  const schema = augmentSchema(baseSchema, [
    maybeWithMinMax(min, max),
    maybeRequired(required),
    maybeReadonly(writable),
  ]);

  return schema.describe('A dynamic zone field');
};

/**
 * Converts an email attribute to a Zod schema.
 * @param attribute - The Email attribute object from the Strapi schema.
 * @returns A Zod schema representing the email field.
 */
export const emailToSchema = (attribute: Schema.Attribute.Email): z.Schema => {
  const { writable, required, default: defaultValue, minLength, maxLength } = attribute;

  const baseSchema = z.email();

  const schema = augmentSchema(baseSchema, [
    maybeWithMinMax(minLength, maxLength),
    maybeRequired(required),
    maybeWithDefault(defaultValue),
    maybeReadonly(writable),
  ]);

  return schema.describe('An email field');
};

/**
 * Converts an enumeration attribute to a Zod schema.
 * @param attribute - The Enumeration attribute object from the Strapi schema.
 * @returns A Zod schema representing the enumeration field.
 */
export const enumToSchema = (attribute: Schema.Attribute.Enumeration<string[]>): z.Schema => {
  const { writable, required, default: defaultValue, enum: enumValues } = attribute;

  const baseSchema = z.enum(enumValues);

  const schema = augmentSchema(baseSchema, [
    maybeRequired(required),
    maybeWithDefault(defaultValue),
    maybeReadonly(writable),
  ]);

  return schema.describe('An enum field');
};

/**
 * Converts a float attribute to a Zod schema.
 * @param attribute - The Float attribute object from the Strapi schema.
 * @returns A Zod schema representing the float field.
 */
export const floatToSchema = (attribute: Schema.Attribute.Float): z.Schema => {
  const { writable, required, min, max, default: defaultValue } = attribute;

  const schema = augmentSchema(z.number(), [
    maybeWithMinMax(min, max),
    maybeRequired(required),
    maybeReadonly(writable),
    maybeWithDefault(defaultValue),
  ]);

  return schema.describe('A float field');
};

/**
 * Converts an integer attribute to a Zod schema.
 * @param attribute - The Integer attribute object from the Strapi schema.
 * @returns A Zod schema representing the integer field.
 */
export const integerToSchema = (attribute: Schema.Attribute.Integer): z.Schema => {
  const { writable, required, min, max, default: defaultValue } = attribute;

  const baseSchema = z.number().int();

  const schema = augmentSchema(baseSchema, [
    maybeWithMinMax(min, max),
    maybeRequired(required),
    maybeReadonly(writable),
    maybeWithDefault(defaultValue),
  ]);

  return schema.describe('An integer field');
};

/**
 * Converts a JSON attribute to a Zod schema.
 * @param attribute - The JSON attribute object from the Strapi schema.
 * @returns A Zod schema representing the JSON field.
 */
export const jsonToSchema = (attribute: Schema.Attribute.JSON): z.Schema => {
  const { writable, required, default: defaultValue } = attribute;

  const schema = augmentSchema(z.any(), [
    maybeRequired(required),
    maybeWithDefault(defaultValue),
    maybeReadonly(writable),
  ]);

  return schema.describe('A JSON field');
};

/**
 * Converts a media attribute to a Zod schema.
 * @param attribute - The Media attribute object from the Strapi schema.
 * @returns A Zod schema representing the media field.
 */
export const mediaToSchema = (
  attribute: Schema.Attribute.Media<Schema.Attribute.MediaKind | undefined, boolean>
): z.Schema => {
  const { writable, required, multiple } = attribute;

  const uploadPlugin = strapi.plugin('upload');

  // @ts-expect-error there is a mismatch between a raw module and a loader module
  const fileSchema = uploadPlugin.contentTypes.file as Struct.ContentTypeSchema;

  const mediaSchema = safeSchemaCreation(
    fileSchema.uid,
    () => new CoreContentTypeRouteValidator(strapi, fileSchema.uid).document
  ) as z.ZodType;

  const baseSchema = multiple ? z.array(mediaSchema) : mediaSchema;

  const schema = augmentSchema(baseSchema, [maybeRequired(required), maybeReadonly(writable)]);

  return schema.describe('A media field');
};

/**
 * Converts a relation attribute to a Zod schema.
 * @param attribute - The Relation attribute object from the Strapi schema.
 * @returns A Zod schema representing the relational field.
 */
export const relationToSchema = (attribute: Schema.Attribute.Relation): z.Schema => {
  if (!('target' in attribute)) {
    return z.any();
  }

  const { writable, required, target } = attribute as Schema.Attribute.RelationWithTarget;

  const targetSchema = safeSchemaCreation(
    target,
    () => new CoreContentTypeRouteValidator(strapi, target).document
  ) as z.ZodType;

  const baseSchema = relations.isAnyToMany(attribute) ? z.array(targetSchema) : targetSchema;

  const schema = augmentSchema(baseSchema, [maybeRequired(required), maybeReadonly(writable)]);

  return schema.describe('A relational field');
};

/**
 * Converts a string, text, rich text, or password attribute to a Zod schema.
 * @param attribute - The String, Text, RichText, or Password attribute object from the Strapi schema.
 * @returns A Zod schema representing the field.
 */
export const stringToSchema = (
  attribute:
    | Schema.Attribute.String
    | Schema.Attribute.Text
    | Schema.Attribute.RichText
    | Schema.Attribute.Password
): z.Schema => {
  const { writable, required, default: defaultValue, minLength, maxLength } = attribute;

  const schema = augmentSchema(z.string(), [
    maybeWithMinMax(minLength, maxLength),
    maybeRequired(required),
    maybeWithDefault(defaultValue),
    maybeReadonly(writable),
  ]);

  return schema.describe(`A ${attribute.type} field`);
};

/**
 * Converts a time attribute to a Zod schema.
 * @param attribute - The Time attribute object from the Strapi schema.
 * @returns A Zod schema representing the time field.
 */
export const timeToSchema = (attribute: Schema.Attribute.Time): z.Schema => {
  const { writable, required, default: defaultValue } = attribute;

  const schema = augmentSchema(z.string(), [
    maybeRequired(required),
    maybeWithDefault(defaultValue),
    maybeReadonly(writable),
  ]);

  return schema.describe('A time field');
};

/**
 * Converts a timestamp attribute to a Zod schema.
 * @param attribute - The Timestamp attribute object from the Strapi schema.
 * @returns A Zod schema representing the timestamp field.
 */
export const timestampToSchema = (attribute: Schema.Attribute.Timestamp): z.Schema => {
  const { writable, required, default: defaultValue } = attribute;

  const baseSchema = z.union([z.string(), z.number()]);

  const schema = augmentSchema(baseSchema, [
    maybeRequired(required),
    maybeWithDefault(defaultValue),
    maybeReadonly(writable),
  ]);

  return schema.describe('A timestamp field');
};

/**
 * Converts a UID attribute to a Zod schema.
 * @param attribute - The UID attribute object from the Strapi schema.
 * @returns A Zod schema representing the UID field.
 */
export const uidToSchema = (attribute: Schema.Attribute.UID): z.Schema => {
  const { writable, required, default: defaultValue, minLength, maxLength } = attribute;

  const schema = augmentSchema(z.string(), [
    maybeWithMinMax(minLength, maxLength),
    maybeRequired(required),
    maybeWithDefault(defaultValue),
    maybeReadonly(writable),
  ]);

  return schema.describe('A UID field');
};

/**
 * Converts a BigInteger attribute to a Zod schema for input validation.
 * @param attribute - The BigInteger attribute object from the Strapi schema.
 * @returns A Zod schema for input validation of the BigInteger field.
 */
export const bigIntegerToInputSchema = (attribute: Schema.Attribute.BigInteger) => {
  const { required, min, max, default: defaultValue } = attribute;

  const schema = augmentSchema(z.string(), [
    (schema) => (min !== undefined ? schema.min(min as unknown as number) : schema),
    (schema) => (max !== undefined ? schema.max(max as unknown as number) : schema),
    maybeRequired(required),
    maybeWithDefault(defaultValue),
  ]);

  return schema.describe('A biginteger field');
};

/**
 * Converts a blocks attribute to a Zod schema for input validation.
 * @returns A Zod schema for input validation of the blocks field.
 */
export const blocksToInputSchema = () => {
  // TODO: better support blocks data structure
  return z.array(z.any()).describe('A blocks field');
};

/**
 * Converts a boolean attribute to a Zod schema for input validation.
 * @param attribute - The Boolean attribute object from the Strapi schema.
 * @returns A Zod schema for input validation of the boolean field.
 */
export const booleanToInputSchema = (attribute: Schema.Attribute.Boolean) => {
  const { required, default: defaultValue } = attribute;

  const baseSchema = z.enum(BOOLEAN_LITERAL_VALUES).nullable();

  const schema = augmentSchema(baseSchema, [
    maybeRequired(required),
    maybeWithDefault(defaultValue),
  ]);

  return schema.describe('A boolean field');
};

/**
 * Converts a component attribute to a Zod schema for input validation.
 * @param attribute - The Component attribute object from the Strapi schema.
 * @returns A Zod schema for input validation of the component field.
 */
export const componentToInputSchema = (
  attribute: Schema.Attribute.Component<UID.Component, boolean>
) => {
  const { required, repeatable, min, max } = attribute;

  const baseSchema = repeatable ? z.array(z.any()) : z.any();

  const schema = augmentSchema(baseSchema, [
    (schema) => (min !== undefined && schema instanceof z.ZodArray ? schema.min(min) : schema),
    (schema) => (max !== undefined && schema instanceof z.ZodArray ? schema.max(max) : schema),
    maybeRequired(required),
  ]);

  return schema.describe('A component field');
};

/**
 * Converts a date attribute to a Zod schema for input validation.
 * @param attribute - The Date attribute object from the Strapi schema.
 * @returns A Zod schema for input validation of the date field.
 */
export const dateToInputSchema = (attribute: Schema.Attribute.Date) => {
  const { required, default: defaultValue } = attribute;

  const schema = augmentSchema(z.string(), [
    maybeRequired(required),
    maybeWithDefault(defaultValue),
  ]);

  return schema.describe('A date field');
};

/**
 * Converts a datetime attribute to a Zod schema for input validation.
 * @param attribute - The DateTime attribute object from the Strapi schema.
 * @returns A Zod schema for input validation of the datetime field.
 */
export const datetimeToInputSchema = (attribute: Schema.Attribute.DateTime) => {
  const { required, default: defaultValue } = attribute;

  const schema = augmentSchema(z.string(), [
    maybeRequired(required),
    maybeWithDefault(defaultValue),
  ]);

  return schema.describe('A datetime field');
};

/**
 * Converts a decimal attribute to a Zod schema for input validation.
 * @param attribute - The Decimal attribute object from the Strapi schema.
 * @returns A Zod schema for input validation of the decimal field.
 */
export const decimalToInputSchema = (attribute: Schema.Attribute.Decimal) => {
  const { required, min, max, default: defaultValue } = attribute;

  const schema = augmentSchema(z.number(), [
    maybeWithMinMax(min, max),
    maybeRequired(required),
    maybeWithDefault(defaultValue),
  ]);

  return schema.describe('A decimal field');
};

/**
 * Converts a dynamic zone attribute to a Zod schema for input validation.
 * @param attribute - The DynamicZone attribute object from the Strapi schema.
 * @returns A Zod schema for input validation of the dynamic zone field.
 */
export const dynamicZoneToInputSchema = (attribute: Schema.Attribute.DynamicZone) => {
  const { required, min, max } = attribute;

  const baseSchema = z.array(z.any());

  const schema = augmentSchema(baseSchema, [maybeWithMinMax(min, max), maybeRequired(required)]);

  return schema.describe('A dynamic zone field');
};

/**
 * Converts an email attribute to a Zod schema for input validation.
 * @param attribute - The Email attribute object from the Strapi schema.
 * @returns A Zod schema for input validation of the email field.
 */
export const emailToInputSchema = (attribute: Schema.Attribute.Email) => {
  const { required, default: defaultValue, minLength, maxLength } = attribute;

  const baseSchema = z.email();

  const schema = augmentSchema(baseSchema, [
    maybeWithMinMax(minLength, maxLength),
    maybeRequired(required),
    maybeWithDefault(defaultValue),
  ]);

  return schema.describe('An email field');
};

/**
 * Converts an enumeration attribute to a Zod schema for input validation.
 * @param attribute - The Enumeration attribute object from the Strapi schema.
 * @returns A Zod schema for input validation of the enumeration field.
 */
export const enumerationToInputSchema = (attribute: Schema.Attribute.Enumeration<string[]>) => {
  const { required, default: defaultValue, enum: enumValues } = attribute;

  const baseSchema = z.enum(enumValues);

  const schema = augmentSchema(baseSchema, [
    maybeRequired(required),
    maybeWithDefault(defaultValue),
  ]);

  return schema.describe('An enum field');
};

/**
 * Converts a float attribute to a Zod schema for input validation.
 * @param attribute - The Float attribute object from the Strapi schema.
 * @returns A Zod schema for input validation of the float field.
 */
export const floatToInputSchema = (attribute: Schema.Attribute.Float) => {
  const { required, min, max, default: defaultValue } = attribute;

  const schema = augmentSchema(z.number(), [
    maybeWithMinMax(min, max),
    maybeRequired(required),
    maybeWithDefault(defaultValue),
  ]);

  return schema.describe('A float field');
};

/**
 * Converts an integer attribute to a Zod schema for input validation.
 * @param attribute - The Integer attribute object from the Strapi schema.
 * @returns A Zod schema for input validation of the integer field.
 */
export const integerToInputSchema = (attribute: Schema.Attribute.Integer) => {
  const { required, min, max, default: defaultValue } = attribute;

  const baseSchema = z.number().int();

  const schema = augmentSchema(baseSchema, [
    maybeWithMinMax(min, max),
    maybeRequired(required),
    maybeWithDefault(defaultValue),
  ]);

  return schema.describe('A float field');
};

/**
 * Converts a JSON attribute to a Zod schema for input validation.
 * @param attribute - The JSON attribute object from the Strapi schema.
 * @returns A Zod schema for input validation of the JSON field.
 */
export const jsonToInputSchema = (attribute: Schema.Attribute.JSON) => {
  const { required, default: defaultValue } = attribute;

  const schema = augmentSchema(z.any(), [maybeRequired(required), maybeWithDefault(defaultValue)]);

  return schema.describe('A JSON field');
};

/**
 * Converts a media attribute to a Zod schema for input validation.
 * @param attribute - The Media attribute object from the Strapi schema.
 * @returns A Zod schema for input validation of the media field.
 */
export const mediaToInputSchema = (
  attribute: Schema.Attribute.Media<Schema.Attribute.MediaKind | undefined, boolean>
) => {
  const { required, multiple } = attribute;

  const baseSchema = multiple ? z.array(z.any()) : z.any();

  const schema = augmentSchema(baseSchema, [maybeRequired(required)]);

  return schema.describe('A media field');
};

/**
 * Converts a relation attribute to a Zod schema for input validation.
 * @param attribute - The Relation attribute object from the Strapi schema.
 * @returns A Zod schema for input validation of the relational field.
 */
export const relationToInputSchema = (attribute: Schema.Attribute.Relation) => {
  const { required } = attribute;

  const isToMany = relations.isAnyToMany(attribute);
  const uuid = z.string().uuid();
  const baseSchema = isToMany ? z.array(uuid) : uuid;

  const schema = augmentSchema(baseSchema, [maybeRequired(required)]);

  return schema.describe('A relational field');
};

/**
 * Converts a string, text, rich text, or password attribute to a Zod schema for input validation.
 * @param attribute - The String, Text, RichText, or Password attribute object from the Strapi schema.
 * @returns A Zod schema for input validation of the field.
 */
export const textToInputSchema = (
  attribute:
    | Schema.Attribute.String
    | Schema.Attribute.Text
    | Schema.Attribute.RichText
    | Schema.Attribute.Password
) => {
  const { required, default: defaultValue, minLength, maxLength } = attribute;

  const schema = augmentSchema(z.string(), [
    maybeWithMinMax(minLength, maxLength),
    maybeRequired(required),
    maybeWithDefault(defaultValue),
  ]);

  return schema.describe(`A ${attribute.type} field`);
};

/**
 * Converts a time attribute to a Zod schema for input validation.
 * @param attribute - The Time attribute object from the Strapi schema.
 * @returns A Zod schema for input validation of the time field.
 */
export const timeToInputSchema = (attribute: Schema.Attribute.Time) => {
  const { required, default: defaultValue } = attribute;

  const schema = augmentSchema(z.string(), [
    maybeRequired(required),
    maybeWithDefault(defaultValue),
  ]);

  return schema.describe('A time field');
};

/**
 * Converts a timestamp attribute to a Zod schema for input validation.
 * @param attribute - The Timestamp attribute object from the Strapi schema.
 * @returns A Zod schema for input validation of the timestamp field.
 */
export const timestampToInputSchema = (attribute: Schema.Attribute.Timestamp) => {
  const { required, default: defaultValue } = attribute;

  const baseSchema = z.union([z.string(), z.number()]);

  const schema = augmentSchema(baseSchema, [
    maybeRequired(required),
    maybeWithDefault(defaultValue),
  ]);

  return schema.describe('A timestamp field');
};

/**
 * Converts a UID attribute to a Zod schema for input validation.
 * @param attribute - The UID attribute object from the Strapi schema.
 * @returns A Zod schema for input validation of the UID field.
 */
export const uidToInputSchema = (attribute: Schema.Attribute.UID) => {
  const { required, default: defaultValue, minLength, maxLength } = attribute;

  const schema = augmentSchema(z.string(), [
    maybeWithMinMax(minLength, maxLength),
    maybeRequired(required),
    maybeWithDefault(defaultValue),
  ]);

  return schema.describe('A UID field');
};
