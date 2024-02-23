import _ from 'lodash/fp';
import { getNameFromTokens } from './shortener';

// Constants for column names used in naming methods
export const ENTITY = 'entity';
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
export const getName = (names: NameInput, options: NameOptions = {}) => {
  const tokens = _.castArray(names).map((name) => {
    return {
      name,
      compressible: true,
    };
  });

  if (options.suffix) {
    tokens.push({ name: options.suffix, compressible: false });
  }

  if (options.prefix) {
    tokens.unshift({ name: options.prefix, compressible: false });
  }

  return getNameFromTokens(tokens, options?.maxLength);
};

/**
 * TABLES
 */

export const getTableName = (name: string, options?: NameOptions) => {
  const tokens = [
    {
      name,
      compressible: true,
    },
  ];

  if (options?.suffix) {
    tokens.push({ name: options.suffix, compressible: false });
  }

  if (options?.prefix) {
    tokens.unshift({ name: options?.prefix, compressible: false });
  }

  return getNameFromTokens(tokens);
};

export const getJoinTableName = (collectionName: string, attributeName: string) => {
  return getName([collectionName, attributeName], { suffix: 'links' }); // _.snakeCase(`${tableName}_${attributeName}_links`);
};

export const getMorphTableName = (collectionName: string, attributeName: string) => {
  return getName([collectionName, attributeName], { suffix: 'morphs' }); // _.snakeCase(`${tableName}_${attributeName}_morphs`);
};

/**
 * COLUMNS
 */

export const getColumnName = (attributeName: string) => {
  return getName(attributeName);
};

export const getJoinColumnEntityIdName = () => {
  return getName(ENTITY, { suffix: 'id' });
};

export const getJoinColumnAttributeIdName = (attributeName: string) => {
  return getName(attributeName, { suffix: 'id' });
};

export const getJoinColumnIdName = (singularName: string) => {
  return getName(singularName, { suffix: 'id' });
};

export const getInverseJoinColumnIdName = (singularName: string) => {
  return getName(singularName, { suffix: 'id', prefix: 'inv' });
};

export const getOrderColumnName = (singularName: string) => {
  return getName(singularName, { suffix: 'order' });
};

export const getInverseOrderColumnName = (singularName: string) => {
  return getName(singularName, { suffix: 'order', prefix: 'inv' });
};

/**
 * Morph Join Tables
 */
export const getMorphColumnJoinTableIdName = (singularName: string) => {
  return getName(singularName, { suffix: 'id' });
};

export const getMorphColumnAttributeIdName = (attributeName: string) => {
  return getName(attributeName, { suffix: 'id' });
};

export const getMorphColumnTypeName = (attributeName: string) => {
  return getName(attributeName, { suffix: 'type' });
};

/**
 * INDEXES
 */

export const getIndexName = (names: NameInput) => {
  return getName(names, { suffix: 'index' });
};

export const getFkIndexName = (names: NameInput) => {
  return getName(names, { suffix: 'fk' });
};

export const getInverseFkIndexName = (names: NameInput) => {
  return getName(names, { suffix: 'inv_fk' });
};

export const getOrderFkIndexName = (names: NameInput) => {
  return getName(names, { suffix: 'order_fk' });
};

export const getOrderInverseFkIndexName = (names: NameInput) => {
  return getName(names, { suffix: 'order_inv_fk' });
};

export const getUniqueIndexName = (names: NameInput) => {
  return getName(names, { suffix: 'unique' });
};
