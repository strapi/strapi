import _ from 'lodash/fp';
import crypto from 'node:crypto';

/**
 * IMPORTANT
 * Any changes here that result in a different output string from any of the naming methods will
 * cause the schema creation on Strapi bootstrap to delete data it doesn't recognize because the name
 * is different.
 *
 * If there are any test failures after updating this code, it means there is a breaking change that
 * will cause data loss, so beware
 */

// TODO: Names will not be shortened until this is set to a non-zero number
export const MAX_DB_IDENTIFIER_LENGTH = 0;
export const HASH_LENGTH = 4;
export const HASH_SEPARATOR = ''; // no separator is needed, we will just attach hash directly to shortened name

export const ENTITY = 'entity';
export const ID_COLUMN = 'id';
export const ORDER_COLUMN = 'order';
export const FIELD_COLUMN = 'field';

type NameToken = {
  allocatedLength?: number;
  name: string;
  compressible: boolean;
};

type NameInput = string | string[];

type NameOptions = {
  suffix?: string;
  prefix?: string;
  maxLength?: number;
};

// returns a hash of length len
export function createHash(data: string, len: number): string {
  if (!_.isInteger(len) || len <= 0) {
    throw new Error('length must be a positive integer');
  }

  // TODO: shake256 is based on SHA-3 and is slow, we don't care about cryptographically secure, only uniqueness and speed
  //       investigate alternatives before releasing this
  const hash = crypto.createHash('shake256', { outputLength: Math.ceil(len / 2) }).update(data);
  return hash.digest('hex').substring(0, len);
}

export function tokenWithHash(name: string, len: number) {
  if (!_.isInteger(len) || len <= 0) {
    throw new Error('length must be a positive integer');
  }
  if (name.length <= len) {
    return name;
  }

  const availableLength = len - HASH_LENGTH - 1;
  if (availableLength < 2) {
    throw new Error(`length too short, minimum is ${HASH_LENGTH + 3}, received ${len}`);
  }

  console.log('tokenWithHash', name, len, availableLength);
  return `${name.substring(0, availableLength)}${HASH_SEPARATOR}${createHash(name, HASH_LENGTH)}`;
}

export function getNameFromTokens(nameTokens: NameToken[], maxLength = MAX_DB_IDENTIFIER_LENGTH) {
  if (!_.isInteger(maxLength) || maxLength < 0) {
    throw new Error('max length must be a positive integer or 0 to disable');
  }

  // Ensure all tokens are in snake_case
  nameTokens.forEach((token) => {
    if (token.name !== _.snakeCase(token.name)) {
      throw new Error(`all names must already be in snake_case; received ${token.name}`);
    }
  });

  // Split tokens by compressibility
  const { compressible, incompressible } = nameTokens.reduce(
    (acc: { compressible: NameToken[]; incompressible: NameToken[] }, token) => {
      acc[token.compressible ? 'compressible' : 'incompressible'].push(token);
      return acc;
    },
    { compressible: [], incompressible: [] }
  );

  const incompressibleLength = incompressible.reduce((sum, token) => sum + token.name.length, 0);
  const separatorsLength = HASH_SEPARATOR.length * (nameTokens.length - 1);
  let available = maxLength - incompressibleLength - separatorsLength;

  if (available <= 0) {
    throw new Error('Not enough space available to shorten identifier');
  }

  // Calculate initial available length per compressible token
  let availablePerToken = available / compressible.length;

  // Sort compressible tokens by length (shortest first) to redistribute length more effectively
  compressible.sort((a, b) => a.name.length - b.name.length);

  // Redistribute lengths
  compressible.forEach((token, index) => {
    const actualLength = token.name.length;
    if (actualLength < availablePerToken) {
      // Redistribute surplus from this token to others
      const surplus = availablePerToken - actualLength;
      available -= actualLength; // Decrease available total by the actual length used
      const remainingTokens = compressible.length - (index + 1);
      if (remainingTokens > 0) {
        availablePerToken += surplus / remainingTokens; // Redistribute surplus to remaining tokens
      }
    } else {
      token.allocatedLength = Math.floor(availablePerToken); // Allocate length to this token
      available -= token.allocatedLength; // Update available length
      if (index < compressible.length - 1) {
        // Recalculate availablePerToken for remaining tokens if not the last token
        availablePerToken = available / (compressible.length - (index + 1));
      }
    }
  });

  // Build final string
  const shortenedName = nameTokens
    .map((token) => {
      if (token.compressible && 'allocatedLength' in token) {
        return tokenWithHash(token.name, token.allocatedLength!);
      }
      if (token.compressible) {
        // Use remaining available length for the last compressible token
        return tokenWithHash(token.name, Math.floor(available + availablePerToken));
      }
      return token.name;
    })
    .join('_');

  return shortenedName;
}

// Generic name handler that must be used by all helper functions
export const getName = (names: NameInput, options: NameOptions = {}) => {
  const tokens = _.castArray(names).map((name) => {
    if (name !== _.snakeCase(name)) {
      throw new Error(`all name tokens must already be in snake_case; received ${name}`);
    }
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

// Get a base table name for a model
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
