import type { Schema } from '@strapi/types';

import { relations } from '@strapi/utils';
import { z } from 'zod';

import { BOOLEAN_LITERAL_VALUES } from './constants';
import { CoreComponentRouteValidator } from './component';
import { CoreContentTypeRouteValidator } from './content-type';

/**
 * Maps a Strapi attribute definition to a corresponding Zod validation schema.
 * This function handles various Strapi attribute types and converts them into
 * appropriate Zod validation schemas with their respective constraints.
 *
 * @param attribute - The Strapi attribute configuration object. Contains type information
 *                   and validation rules for the attribute.
 *
 * @returns A Zod schema that corresponds to the input attribute's type and validation rules
 *
 * @example
 * ```typescript
 * // String attribute with constraints
 * const stringAttribute = {
 *   type: 'string',
 *   minLength: 3,
 *   maxLength: 50,
 *   required: true
 * };
 * const stringSchema = mapAttributeToSchema(stringAttribute);
 *
 * // Enumeration attribute
 * const enumAttribute = {
 *   type: 'enumeration',
 *   enum: ['draft', 'published', 'archived']
 * };
 * const enumSchema = mapAttributeToSchema(enumAttribute);
 *
 * // Media attribute with multiple files
 * const mediaAttribute = {
 *   type: 'media',
 *   multiple: true
 * };
 * const mediaSchema = mapAttributeToSchema(mediaAttribute);
 * ```
 *
 * @throws {Error} Throws an error if an unsupported attribute type is provided
 *
 * @remarks
 * - Complex types (component, relation, dynamic zone) use placeholder schemas
 *
 * @todo: Move to @strapi/utils if needed for other validation
 */
export const mapAttributeToSchema = (attribute: Schema.Attribute.AnyAttribute): z.Schema => {
  switch (attribute.type) {
    case 'biginteger': {
      const { writable, required, min, max, default: defaultValue } = attribute;

      const schema = augmentSchema(z.string(), [
        (schema) => (min !== undefined ? schema.min(min as unknown as number) : schema),
        (schema) => (max !== undefined ? schema.max(max as unknown as number) : schema),
        maybeRequired(required),
        maybeWithDefault(defaultValue),
        maybeReadonly(writable),
      ]);

      return schema.describe('A biginteger field');
    }
    case 'blocks': {
      // TODO: better support blocks data structure
      return z.array(z.any()).describe('A blocks field');
    }
    case 'boolean': {
      const { writable, required, default: defaultValue } = attribute;

      const schema = augmentSchema(z.boolean(), [
        maybeRequired(required),
        maybeWithDefault(defaultValue),
        maybeReadonly(writable),
      ]);

      return schema.describe('A boolean field');
    }
    case 'component': {
      const { _idmap } = z.globalRegistry;

      const set = (id: string, schema: z.ZodType) => {
        if (_idmap.has(id)) {
          _idmap.delete(id);
        }

        z.globalRegistry.add(schema, { id });
      };

      const { writable, required, min, max, component, repeatable } = attribute;

      const existsInGlobalRegistry = _idmap.has(component);

      let componentSchema: z.ZodType;

      if (existsInGlobalRegistry) {
        componentSchema = _idmap.get(component) as z.ZodType;
      } else {
        set(component, z.any());

        const validator = new CoreComponentRouteValidator(strapi, component);
        const schema = validator.entry;

        set(component, schema);

        componentSchema = schema;
      }

      const baseSchema = repeatable ? z.array(componentSchema) : componentSchema;

      const schema = augmentSchema(baseSchema, [
        (schema) => (min !== undefined && schema instanceof z.ZodArray ? schema.min(min) : schema),
        (schema) => (max !== undefined && schema instanceof z.ZodArray ? schema.max(max) : schema),
        maybeRequired(required),
        maybeReadonly(writable),
      ]);

      return schema.describe('A component field');
    }
    case 'date': {
      const { writable, required, default: defaultValue } = attribute;

      const schema = augmentSchema(z.string(), [
        maybeRequired(required),
        maybeWithDefault(defaultValue),
        maybeReadonly(writable),
      ]);

      return schema.describe('A date field');
    }
    case 'datetime': {
      const { writable, required, default: defaultValue } = attribute;

      const baseSchema = z.string();

      const schema = augmentSchema(baseSchema, [
        maybeRequired(required),
        maybeWithDefault(defaultValue),
        maybeReadonly(writable),
      ]);

      return schema.describe('A datetime field');
    }
    case 'decimal': {
      const { writable, required, min, max, default: defaultValue } = attribute;

      const schema = augmentSchema(z.number(), [
        maybeWithMinMax(min, max),
        maybeRequired(required),
        maybeWithDefault(defaultValue),
        maybeReadonly(writable),
      ]);

      return schema.describe('A decimal field');
    }
    // TODO(zodV4): use the components' reference type instead of z.any
    // TODO(zodV4): use discriminated unions to handle the different types of components
    case 'dynamiczone': {
      const { writable, required, min, max } = attribute;

      const baseSchema = z.array(z.any());

      const schema = augmentSchema(baseSchema, [
        maybeWithMinMax(min, max),
        maybeRequired(required),
        maybeReadonly(writable),
      ]);

      return schema.describe('A dynamic zone field');
    }
    case 'email': {
      const { writable, required, default: defaultValue, minLength, maxLength } = attribute;

      const baseSchema = z.string().email();

      const schema = augmentSchema(baseSchema, [
        maybeWithMinMax(minLength, maxLength),
        maybeRequired(required),
        maybeWithDefault(defaultValue),
        maybeReadonly(writable),
      ]);

      return schema.describe('An email field');
    }
    case 'enumeration': {
      const { writable, required, default: defaultValue, enum: enumValues } = attribute;

      const baseSchema = z.enum(enumValues as [string]);

      const schema = augmentSchema(baseSchema, [
        maybeRequired(required),
        maybeWithDefault(defaultValue),
        maybeReadonly(writable),
      ]);

      return schema.describe('An enum field');
    }
    case 'float': {
      const { writable, required, min, max, default: defaultValue } = attribute;

      const schema = augmentSchema(z.number(), [
        maybeWithMinMax(min, max),
        maybeRequired(required),
        maybeReadonly(writable),
        maybeWithDefault(defaultValue),
      ]);

      return schema.describe('A float field');
    }
    case 'integer': {
      const { writable, required, min, max, default: defaultValue } = attribute;

      const baseSchema = z.number().int();

      const schema = augmentSchema(baseSchema, [
        maybeWithMinMax(min, max),
        maybeRequired(required),
        maybeReadonly(writable),
        maybeWithDefault(defaultValue),
      ]);

      return schema.describe('A float field');
    }
    // TODO(zodV4): use reference to create fake cyclical JSON values
    //              see https://zod.dev/?id=json-type for more info
    case 'json': {
      const { writable, required, default: defaultValue } = attribute;

      const schema = augmentSchema(z.any(), [
        maybeRequired(required),
        maybeWithDefault(defaultValue),
        maybeReadonly(writable),
      ]);

      return schema.describe('A JSON field');
    }
    case 'media': {
      const { writable, required, multiple } = attribute;

      const baseSchema = multiple ? z.array(z.any()) : z.any();

      const schema = augmentSchema(baseSchema, [maybeRequired(required), maybeReadonly(writable)]);

      return schema.describe('A media field');
    }
    // TODO(zodV4): handle polymorphic relations using discriminated unions
    case 'relation': {
      // Extract writable and required flags from the attribute
      if (!('target' in attribute)) {
        return z.any();
      }

      const { _idmap } = z.globalRegistry;

      const set = (id: string, schema: z.ZodType) => {
        if (_idmap.has(id)) {
          _idmap.delete(id);
        }

        z.globalRegistry.add(schema, { id });
      };

      const { writable, required, target } = attribute as Schema.Attribute.RelationWithTarget;

      const existsInGlobalRegistry = _idmap.has(target);

      let targetSchema: z.ZodType;

      if (existsInGlobalRegistry) {
        targetSchema = _idmap.get(target) as z.ZodType;
      } else {
        set(target, z.any());

        const validator = new CoreContentTypeRouteValidator(strapi, target);
        const schema = validator.document;

        set(target, schema);

        targetSchema = schema;
      }

      const baseSchema = relations.isAnyToMany(attribute) ? z.array(targetSchema) : targetSchema;

      // Add required and readonly constraints based on attribute flags
      const schema = augmentSchema(baseSchema, [maybeRequired(required), maybeReadonly(writable)]);

      return schema.describe('A relational field');
    }
    case 'password':
    case 'text':
    case 'richtext':
    case 'string': {
      const { writable, required, default: defaultValue, minLength, maxLength } = attribute;

      const schema = augmentSchema(z.string(), [
        maybeWithMinMax(minLength, maxLength),
        maybeRequired(required),
        maybeWithDefault(defaultValue),
        maybeReadonly(writable),
      ]);

      return schema.describe(`A ${attribute.type} field`);
    }
    case 'time': {
      const { writable, required, default: defaultValue } = attribute;

      const schema = augmentSchema(z.string(), [
        maybeRequired(required),
        maybeWithDefault(defaultValue),
        maybeReadonly(writable),
      ]);

      return schema.describe('A time field');
    }
    case 'timestamp': {
      const { writable, required, default: defaultValue } = attribute;

      const baseSchema = z.union([z.string(), z.number()]);

      const schema = augmentSchema(baseSchema, [
        maybeRequired(required),
        maybeWithDefault(defaultValue),
        maybeReadonly(writable),
      ]);

      return schema.describe('A timestamp field');
    }
    case 'uid': {
      const { writable, required, default: defaultValue, minLength, maxLength } = attribute;

      const schema = augmentSchema(z.string(), [
        maybeWithMinMax(minLength, maxLength),
        maybeRequired(required),
        maybeWithDefault(defaultValue),
        maybeReadonly(writable),
      ]);

      return schema.describe('A UID field');
    }
    default:
      throw new Error(`Unsupported attribute type: ${(attribute as any).type}`);
  }
};

/**
 * Maps a Strapi attribute definition to a corresponding Zod validation schema.
 * This function handles various Strapi attribute types and converts them into
 * appropriate Zod validation schemas with their respective constraints.
 *
 * @param attribute - The Strapi attribute configuration object. Contains type information
 *                   and validation rules for the attribute.
 *
 * @returns A Zod schema that corresponds to the input attribute's type and validation rules
 *
 * @example
 * ```typescript
 * // String attribute with constraints
 * const stringAttribute = {
 *   type: 'string',
 *   minLength: 3,
 *   maxLength: 50,
 *   required: true
 * };
 * const stringSchema = mapAttributeToInputSchema(stringAttribute);
 *
 * // Enumeration attribute
 * const enumAttribute = {
 *   type: 'enumeration',
 *   enum: ['draft', 'published', 'archived']
 * };
 * const enumSchema = mapAttributeToInputSchema(enumAttribute);
 *
 * // Media attribute with multiple files
 * const mediaAttribute = {
 *   type: 'media',
 *   multiple: true
 * };
 * const mediaSchema = mapAttributeToInputSchema(mediaAttribute);
 * ```
 *
 * @throws {Error} Throws an error if an unsupported attribute type is provided
 *
 * @remarks
 * - Complex types (component, relation, dynamic zone) use placeholder schemas
 *
 * @todo: Move to @strapi/utils if needed for other validation
 */
export const mapAttributeToInputSchema = (attribute: Schema.Attribute.AnyAttribute): z.Schema => {
  switch (attribute.type) {
    case 'biginteger': {
      const { required, min, max, default: defaultValue } = attribute;

      const schema = augmentSchema(z.string(), [
        (schema) => (min !== undefined ? schema.min(min as unknown as number) : schema),
        (schema) => (max !== undefined ? schema.max(max as unknown as number) : schema),
        maybeRequired(required),
        maybeWithDefault(defaultValue),
      ]);

      return schema.describe('A biginteger field');
    }
    case 'blocks': {
      // TODO: better support blocks data structure
      return z.array(z.any()).describe('A blocks field');
    }
    case 'boolean': {
      const { required, default: defaultValue } = attribute;

      const baseSchema = z.enum(BOOLEAN_LITERAL_VALUES);

      const schema = augmentSchema(baseSchema, [
        maybeRequired(required),
        maybeWithDefault(defaultValue),
      ]);

      return schema.describe('A boolean field');
    }
    // TODO(zodV4): use the component reference type instead of z.any
    case 'component': {
      const { required, repeatable, min, max } = attribute;

      const baseSchema = repeatable ? z.array(z.any()) : z.any();

      const schema = augmentSchema(baseSchema, [
        (schema) => (min !== undefined && schema instanceof z.ZodArray ? schema.min(min) : schema),
        (schema) => (max !== undefined && schema instanceof z.ZodArray ? schema.max(max) : schema),
        maybeRequired(required),
      ]);

      return schema.describe('A component field');
    }
    case 'date': {
      const { required, default: defaultValue } = attribute;

      const schema = augmentSchema(z.string(), [
        maybeRequired(required),
        maybeWithDefault(defaultValue),
      ]);

      return schema.describe('A date field');
    }
    case 'datetime': {
      const { required, default: defaultValue } = attribute;

      const schema = augmentSchema(z.string(), [
        maybeRequired(required),
        maybeWithDefault(defaultValue),
      ]);

      return schema.describe('A datetime field');
    }
    case 'decimal': {
      const { required, min, max, default: defaultValue } = attribute;

      const schema = augmentSchema(z.number(), [
        maybeWithMinMax(min, max),
        maybeRequired(required),
        maybeWithDefault(defaultValue),
      ]);

      return schema.describe('A decimal field');
    }
    // TODO(zodV4): use the components' reference type instead of z.any
    // TODO(zodV4): use discriminated unions to handle the different types of components
    case 'dynamiczone': {
      const { required, min, max } = attribute;

      const baseSchema = z.array(z.any());

      const schema = augmentSchema(baseSchema, [
        maybeWithMinMax(min, max),
        maybeRequired(required),
      ]);

      return schema.describe('A dynamic zone field');
    }
    case 'email': {
      const { required, default: defaultValue, minLength, maxLength } = attribute;

      const baseSchema = z.string().email();

      const schema = augmentSchema(baseSchema, [
        maybeWithMinMax(minLength, maxLength),
        maybeRequired(required),
        maybeWithDefault(defaultValue),
      ]);

      return schema.describe('An email field');
    }
    case 'enumeration': {
      const { required, default: defaultValue, enum: enumValues } = attribute;

      const baseSchema = z.enum(enumValues as [string]);

      const schema = augmentSchema(baseSchema, [
        maybeRequired(required),
        maybeWithDefault(defaultValue),
      ]);

      return schema.describe('An enum field');
    }
    case 'float': {
      const { required, min, max, default: defaultValue } = attribute;

      const schema = augmentSchema(z.number(), [
        maybeWithMinMax(min, max),
        maybeRequired(required),
        maybeWithDefault(defaultValue),
      ]);

      return schema.describe('A float field');
    }
    case 'integer': {
      const { required, min, max, default: defaultValue } = attribute;

      const baseSchema = z.number().int();

      const schema = augmentSchema(baseSchema, [
        maybeWithMinMax(min, max),
        maybeRequired(required),
        maybeWithDefault(defaultValue),
      ]);

      return schema.describe('A float field');
    }
    // TODO(zodV4): use reference to create fake cyclical JSON values
    //              see https://zod.dev/?id=json-type for more info
    case 'json': {
      const { required, default: defaultValue } = attribute;

      const schema = augmentSchema(z.any(), [
        maybeRequired(required),
        maybeWithDefault(defaultValue),
      ]);

      return schema.describe('A JSON field');
    }
    case 'media': {
      const { required, multiple } = attribute;

      const baseSchema = multiple ? z.array(z.any()) : z.any();

      const schema = augmentSchema(baseSchema, [maybeRequired(required)]);

      return schema.describe('A media field');
    }
    // TODO(zodV4): use reference for relations types
    // TODO(zodV4): handle polymorphic relations using discriminated unions
    // TODO(zodv4): add the relation ordering API https://docs.strapi.io/cms/api/rest/relations
    case 'relation': {
      const { required } = attribute;

      const isToMany = relations.isAnyToMany(attribute);
      const uuid = z.string().uuid();
      const baseSchema = isToMany ? z.array(uuid) : uuid;

      const schema = augmentSchema(baseSchema, [maybeRequired(required)]);

      return schema.describe('A relational field');
    }
    case 'password':
    case 'text':
    case 'richtext':
    case 'string': {
      const { required, default: defaultValue, minLength, maxLength } = attribute;

      const schema = augmentSchema(z.string(), [
        maybeWithMinMax(minLength, maxLength),
        maybeRequired(required),
        maybeWithDefault(defaultValue),
      ]);

      return schema.describe(`A ${attribute.type} field`);
    }
    case 'time': {
      const { required, default: defaultValue } = attribute;

      const schema = augmentSchema(z.string(), [
        maybeRequired(required),
        maybeWithDefault(defaultValue),
      ]);

      return schema.describe('A time field');
    }
    case 'timestamp': {
      const { required, default: defaultValue } = attribute;

      const baseSchema = z.union([z.string(), z.number()]);

      const schema = augmentSchema(baseSchema, [
        maybeRequired(required),
        maybeWithDefault(defaultValue),
      ]);

      return schema.describe('A timestamp field');
    }
    case 'uid': {
      const { required, default: defaultValue, minLength, maxLength } = attribute;

      const schema = augmentSchema(z.string(), [
        maybeWithMinMax(minLength, maxLength),
        maybeRequired(required),
        maybeWithDefault(defaultValue),
      ]);

      return schema.describe('A UID field');
    }
    default:
      throw new Error(`Unsupported attribute type: ${(attribute as any).type}`);
  }
};

const maybeRequired = (required?: boolean) => {
  return <T extends z.Schema>(schema: T) => (required !== true ? schema.optional() : schema);
};

const maybeReadonly = (writable?: boolean) => {
  return <T extends z.Schema>(schema: T) => (writable !== false ? schema : schema.readonly());
};

const maybeWithDefault = (defaultValue?: unknown) => {
  return <T extends z.Schema>(schema: T) => {
    return defaultValue !== undefined
      ? schema.default(typeof defaultValue === 'function' ? defaultValue() : defaultValue)
      : schema;
  };
};

const maybeWithMinMax = (min?: number, max?: number) => {
  return <R extends z.ZodString | z.ZodNumber | z.ZodArray<z.ZodAny>>(schema: R) => {
    return min !== undefined && max !== undefined ? schema.min(min).max(max) : schema;
  };
};

const augmentSchema = <T extends z.Schema>(schema: T, modifiers: ((schema: T) => z.Schema)[]) => {
  return modifiers.reduce((acc, modifier) => modifier(acc) as T, schema);
};
