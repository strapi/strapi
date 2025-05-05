import { type Core, Schema, type UID } from '@strapi/types';
import { contentTypes, relations } from '@strapi/utils';
import { z } from 'zod';

/**
 * AbstractCoreRouteValidator provides the foundation for validating and managing core routes within a Strapi context for a specific model.
 *
 * This abstract class facilitates validation logic for scalar and populatable fields defined in a model schema.
 *
 * It uses runtime information about Strapi models to derive and expose schema validations.
 *
 * @template {UID.Schema} T Representing the schema identifier to be validated.
 */
export abstract class AbstractCoreRouteValidator<T extends UID.Schema> {
  /**
   * The `_strapi` variable serves as a reference to the core Strapi instance.
   * It is used for interacting with the loaded model.
   */
  protected readonly _strapi: Core.Strapi;

  /**
   * A unique identifier used to represent a model within Strapi.
   *
   * The type of the identifier is generic to allow flexibility and ensure type safety
   * when working with either content-types or components.
   */
  protected readonly _uid: T;

  /**
   * Protected constructor for initializing the class with the provided Strapi instance and unique identifier (UID).
   *
   * @param strapi The Strapi instance to be used.
   * @param uid The unique identifier for the instance.
   */
  protected constructor(strapi: Core.Strapi, uid: T) {
    this._strapi = strapi;
    this._uid = uid;
  }

  /**
   * Retrieves an enum schema constructed from the keys of the scalar fields.
   *
   * @return A Zod enum containing the keys from the scalar fields.
   */
  public get scalarFieldsEnum() {
    return z.enum(Object.keys(this._scalarFields) as [string]);
  }

  /**
   * Retrieves an enum schema constructed from the keys of fields that can be populated (relations, components, files, etc.)
   *
   * @return A ZodEnum object containing the list of populatable field keys.
   */
  public get populatableFieldsEnum() {
    return z.enum(Object.keys(this._populatableFields) as [string]);
  }

  /**
   * Retrieves an array representation of the scalar fields.
   *
   * @return An array containing the scalar fields as defined by {@link scalarFieldsEnum}.
   */
  public get scalarFieldsArray() {
    return z.array(this.scalarFieldsEnum);
  }

  /**
   * Retrieves an array of populatable fields.
   *
   * @return A Zod array schema representing the available populatable fields as defined by {@link populatableFieldsEnum}.
   */
  public get populatableFieldsArray() {
    return z.array(this.populatableFieldsEnum);
  }

  /**
   * Retrieves the schema associated with the current model.
   *
   * The schema represents the structural definition of the model,
   * as retrieved from the Strapi model associated with the given UID.
   *
   * @return The schema of the model retrieved from Strapi.
   */
  protected get _schema() {
    return this._strapi.getModel(this._uid);
  }

  /**
   * Retrieves scalar fields from the object's schema attributes.
   *
   * Filters the schema attributes to include only those that are scalar and not private.
   *
   * @return An object composed of scalar fields from the schema attributes.
   */
  protected get _scalarFields() {
    const attributes = Object.entries(this._schema.attributes);

    const scalarEntries = attributes
      .filter(([, attribute]) => contentTypes.isScalarAttribute(attribute))
      .filter(([attributeName]) => !contentTypes.isPrivateAttribute(this._schema, attributeName));

    return Object.fromEntries(scalarEntries);
  }

  /**
   * Retrieves the populatable fields from the schema attributes.
   *
   * Filters the schema attributes to include only those that are populatable and not private.
   *
   * @return An object containing the populatable fields derived from the schema attributes.
   */
  protected get _populatableFields() {
    const attributes = Object.entries(this._schema.attributes);

    const populatableEntries = attributes
      .filter(([, attribute]) => !contentTypes.isScalarAttribute(attribute))
      .filter(([attributeName]) => !contentTypes.isPrivateAttribute(this._schema, attributeName));

    return Object.fromEntries(populatableEntries);
  }

  /**
   * Creates a Zod schema as a record with scalar fields as keys and the specified type as values.
   *
   * @param type - The Zod type to use for the record's values.
   * @return A Zod record schema with scalar fields as keys and the specified type as values.
   */
  public fieldRecord(type: z.ZodTypeAny) {
    return z.record(this.scalarFieldsEnum, type);
  }
}

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
 */
export const mapAttributeToSchema = (attribute: Schema.Attribute.AnyAttribute): z.Schema => {
  switch (attribute.type) {
    case 'string':
    case 'text':
    case 'richtext': {
      const { minLength, maxLength, required, default: def } = attribute;

      return [z.string()]
        .map((schema) => (minLength !== undefined ? schema.min(minLength) : schema))
        .map((schema) => (maxLength !== undefined ? schema.max(maxLength) : schema))
        .map((schema) => (required ? schema : schema.optional()))
        .map((schema) => {
          if (typeof def === 'undefined') {
            return schema;
          }

          // Needed to infer the type and target the correct schema.default() version
          return typeof def === 'function' ? schema.default(def) : schema.default(def);
        })[0];
    }
    case 'blocks':
      return z.string();
    case 'float':
      return z.number().describe(`A float field`);
    case 'decimal':
      return z.number().describe(`A decimal field`);
    case 'biginteger':
      return z.number().describe(`A biginteger field`);
    case 'integer':
      return z.number().int().describe(`An integer field`);
    case 'boolean':
      return z.boolean().describe(`A boolean field`);
    case 'date':
    case 'datetime':
    case 'timestamp':
    case 'time':
      return z.string().datetime().describe(`A date field`);
    case 'email':
      return z.string().email().describe(`An email field`);
    case 'enumeration':
      return z
        .enum(attribute.enum as [string])
        .describe(`An enumeration field with possible values: ${attribute.enum.join(', ')}`);
    case 'component': {
      const schema = z.any().describe('imagine this is a component');

      return attribute.repeatable ? z.array(schema) : schema.nullable();
    }
    case 'relation': {
      const schema = z.any().describe(`A related document`);

      return relations.isAnyToMany(attribute) ? z.array(schema) : schema.nullable();
    }
    case 'dynamiczone':
      return z.array(z.any()).describe('Imagine this is a dynamic zone').nullable();
    case 'json':
      return z.any().describe(`A JSON field`);
    case 'uid':
      return z.string().describe(`A unique identifier (UID) field`);
    case 'password':
      return z.string().describe(`A password field`);
    case 'media': {
      const schema = z.any().describe(`A media field`);

      return attribute.multiple ? z.array(schema) : schema.nullable();
    }
    default:
      throw new Error(`Unsupported attribute type: ${attribute['type']}`);
  }
};
