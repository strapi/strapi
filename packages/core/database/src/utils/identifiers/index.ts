/**
 * This file contains utility functions for generating names used in the database.
 * These names include table names, column names, join table names, index names, and more.
 * The generated names can be customized with prefixes, suffixes, and maximum length.
 * These utility functions are used throughout the codebase to ensure consistent and standardized naming conventions in the database.
 *
 * The reason for checking maxLength for suffixes and prefixes and using the long ones from Strapi 4 is so that we always
 * have access to the full length names, in particular for migration purposes, but also so that (in theory) the feature
 * could be disabled and stay compatible with v4 database structure.
 */
import _, { snakeCase } from 'lodash/fp';

// Import for use within the module
import { type NameToken, getNameFromTokens, getUnshortenedName } from './shortener';

// Re-export
export { type NameToken, getNameFromTokens, getUnshortenedName };

// Constants for column names used in naming methods
export const ID_COLUMN = 'id';
export const ORDER_COLUMN = 'order';
export const FIELD_COLUMN = 'field';
type NameInput = string | string[];

type NameOptions = {
  suffix?: string;
  prefix?: string;
  maxLength: number;
};

// Fixed compression map for suffixes and prefixes
// TODO: fix this in the migration
const replacementMap = {
  // links: 'lnk',
  // order_inv_fk: 'oifk',
  // order: 'ord',
  // morphs: 'mph',
  // index: 'idx',
  // inv_fk: 'ifk',
  // order_fk: 'ofk',
  // id_column_index: 'idix',
  // order_index: 'oidx',
  // unique: 'uq',
  // primary: 'pk',
};

const mapShortForms = (name: string): string | undefined => {
  if (name in replacementMap) {
    return (replacementMap as any)[name];
  }
};

// Generic name handler that must be used by all helper functions
/**
 * TODO: we should be requiring snake_case inputs for all names here, but we
 * aren't and it will require some refactoring to make it work. Currently if
 * we get names 'myModel' and 'my_model' they would be converted to the same
 * final string my_model which generally works but is not entirely safe
 * */
export const getName = (names: NameInput, options: NameOptions) => {
  const tokens: NameToken[] = _.castArray(names).map((name) => {
    return {
      name,
      compressible: true,
    };
  });

  if (options?.suffix) {
    tokens.push({
      name: options.suffix,
      compressible: false,
      shortForm: mapShortForms(options.suffix),
    });
  }

  if (options?.prefix) {
    tokens.unshift({
      name: options.prefix,
      compressible: false,
      shortForm: mapShortForms(options.prefix),
    });
  }

  return getNameFromTokens(tokens, options);
};

/**
 * TABLES
 */

export const getTableName = (name: string, options: NameOptions) => {
  return getName(name, options);
};

export const getJoinTableName = (
  collectionName: string,
  attributeName: string,
  options: NameOptions
) => {
  return getName([collectionName, attributeName], {
    suffix: 'links',
    ...options,
  });
};

export const getMorphTableName = (
  collectionName: string,
  attributeName: string,
  options: NameOptions
) => {
  return getName([snakeCase(collectionName), snakeCase(attributeName)], {
    suffix: 'morphs',
    ...options,
  });
};

/**
 * COLUMNS
 */

export const getColumnName = (attributeName: string, options: NameOptions) => {
  return getName(attributeName, options);
};

export const getJoinColumnAttributeIdName = (attributeName: string, options: NameOptions) => {
  return getName(attributeName, { suffix: 'id', ...options });
};

export const getInverseJoinColumnAttributeIdName = (
  attributeName: string,
  options: NameOptions
) => {
  return getName(snakeCase(attributeName), { suffix: 'id', prefix: 'inv', ...options });
};

export const getOrderColumnName = (singularName: string, options: NameOptions) => {
  return getName(singularName, { suffix: 'order', ...options });
};

export const getInverseOrderColumnName = (singularName: string, options: NameOptions) => {
  return getName(singularName, {
    suffix: 'order',
    prefix: 'inv',
    ...options,
  });
};

/**
 * Morph Join Tables
 */
export const getMorphColumnJoinTableIdName = (singularName: string, options: NameOptions) => {
  return getName(snakeCase(singularName), { suffix: 'id', ...options });
};

export const getMorphColumnAttributeIdName = (attributeName: string, options: NameOptions) => {
  return getName(snakeCase(attributeName), { suffix: 'id', ...options });
};

export const getMorphColumnTypeName = (attributeName: string, options: NameOptions) => {
  return getName(snakeCase(attributeName), { suffix: 'type', ...options });
};

/**
 * INDEXES
 * Note that these methods are generally used to reference full table names + attribute(s), which
 * may already be shortened strings rather than individual parts.
 * That is fine and expected to compress the previously incompressible parts of those strings,
 * because in these cases the relevant information is the table name and we can't really do
 * any better; shortening the individual parts again might make it even more confusing.
 *
 * So for example, the fk for the table `mytable_myattr4567d_localizations` will become
 * mytable_myattr4567d_loc63bf2_fk
 *
 * Indexes were not snake_cased in v4, so they will not be snake-cased here
 * However, some (particularly any beyond the base types) will appear to be snake_case because
 * they accept the joinTableName which is already snake-cased. This results tables that have indexes
 * with both `someindex_index` along with `some_index_inv_fk`
 */

// base index types
export const getIndexName = (names: NameInput, options: NameOptions) => {
  return getName(names, { suffix: 'index', ...options });
};

export const getFkIndexName = (names: NameInput, options: NameOptions) => {
  return getName(names, { suffix: 'fk', ...options });
};

export const getUniqueIndexName = (names: NameInput, options: NameOptions) => {
  return getName(names, { suffix: 'unique', ...options });
};

export const getPrimaryIndexName = (names: NameInput, options: NameOptions) => {
  return getName(names, { suffix: 'primary', ...options });
};

// custom index types
export const getInverseFkIndexName = (names: NameInput, options: NameOptions) => {
  return getName(names, { suffix: 'inv_fk', ...options });
};

export const getOrderFkIndexName = (names: NameInput, options: NameOptions) => {
  return getName(names, { suffix: 'order_fk', ...options });
};

export const getOrderInverseFkIndexName = (names: NameInput, options: NameOptions) => {
  return getName(names, { suffix: 'order_inv_fk', ...options });
};

export const getIdColumnIndexName = (names: NameInput, options: NameOptions) => {
  return getName(names, { suffix: 'id_column_index', ...options });
};

export const getOrderIndexName = (names: NameInput, options: NameOptions) => {
  return getName(names, { suffix: 'order_index', ...options });
};
