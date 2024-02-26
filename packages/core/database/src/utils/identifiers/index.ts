import _ from 'lodash/fp';
import { MAX_DB_IDENTIFIER_LENGTH, getNameFromTokens } from './shortener';

// Constants for column names used in naming methods
export const ID_COLUMN = 'id';
export const ORDER_COLUMN = 'order';
export const FIELD_COLUMN = 'field';

type NameInput = string | string[];

type NameOptions = {
  suffix?: string;
  prefix?: string;
  maxLength?: number;
};

// Generic name handler that must be used by all helper functions
/**
 * TODO: we should be requiring snake_case inputs for all names here, but we
 * aren't and it will require some refactoring to make it work. Currently if
 * we get names 'myModel' and 'my_model' they would be converted to the same
 * final string my_model which generally works but is not entirely safe
 * */
export const getName = (names: NameInput, options?: NameOptions) => {
  const tokens = _.castArray(names).map((name) => {
    return {
      name,
      compressible: true,
    };
  });

  if (options?.suffix) {
    tokens.push({ name: options.suffix, compressible: false });
  }

  if (options?.prefix) {
    tokens.unshift({ name: options.prefix, compressible: false });
  }

  const maxLength = options?.maxLength ?? MAX_DB_IDENTIFIER_LENGTH; // nullish coalesce because 0 is a valid maxLength

  return getNameFromTokens(tokens, maxLength);
};

/**
 * TABLES
 */

export const getTableName = (name: string, options?: NameOptions) => {
  return getName(name, options);
};

export const getJoinTableName = (
  collectionName: string,
  attributeName: string,
  options?: NameOptions
) => {
  return getName([collectionName, attributeName], { suffix: 'links', ...options });
};

export const getMorphTableName = (
  collectionName: string,
  attributeName: string,
  options?: NameOptions
) => {
  return getName([collectionName, attributeName], { suffix: 'morphs', ...options });
};

/**
 * COLUMNS
 */

export const getColumnName = (attributeName: string, options?: NameOptions) => {
  return getName(attributeName, options);
};

export const getJoinColumnAttributeIdName = (attributeName: string, options?: NameOptions) => {
  return getName(attributeName, { suffix: 'id', ...options });
};

export const getInverseJoinColumnAttributeIdName = (
  attributeName: string,
  options?: NameOptions
) => {
  return getName(attributeName, { suffix: 'id', prefix: 'inv', ...options });
};

export const getOrderColumnName = (singularName: string, options?: NameOptions) => {
  return getName(singularName, { suffix: 'order', ...options });
};

export const getInverseOrderColumnName = (singularName: string, options?: NameOptions) => {
  return getName(singularName, { suffix: 'order', prefix: 'inv', ...options });
};

/**
 * Morph Join Tables
 */
export const getMorphColumnJoinTableIdName = (singularName: string, options?: NameOptions) => {
  return getName(singularName, { suffix: 'id', ...options });
};

export const getMorphColumnAttributeIdName = (attributeName: string, options?: NameOptions) => {
  return getName(attributeName, { suffix: 'id', ...options });
};

export const getMorphColumnTypeName = (attributeName: string, options?: NameOptions) => {
  return getName(attributeName, { suffix: 'type', ...options });
};

/**
 * INDEXES
 */

export const getIndexName = (names: NameInput, options?: NameOptions) => {
  return getName(names, { suffix: 'index', ...options });
};

export const getFkIndexName = (names: NameInput, options?: NameOptions) => {
  return getName(names, { suffix: 'fk', ...options });
};

export const getInverseFkIndexName = (names: NameInput, options?: NameOptions) => {
  return getName(names, { suffix: 'inv_fk', ...options });
};

export const getOrderFkIndexName = (names: NameInput, options?: NameOptions) => {
  return getName(names, { suffix: 'order_fk', ...options });
};

export const getOrderInverseFkIndexName = (names: NameInput, options?: NameOptions) => {
  return getName(names, { suffix: 'order_inv_fk', ...options });
};

export const getUniqueIndexName = (names: NameInput, options?: NameOptions) => {
  return getName(names, { suffix: 'unique', ...options });
};
