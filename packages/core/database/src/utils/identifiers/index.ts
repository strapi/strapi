import _ from 'lodash/fp';
import crypto from 'node:crypto';

/**
 * IMPORTANT
 * Any changes here that result in a different output string from any of the naming methods will
 * cause the schema creation on Strapi bootstrap to delete data it doesn't recognize because the name
 * is different.
 *
 * If there are any test failures after updating this code, it means there is a breaking change that
 * will cause data loss, so beware; do not update the test to match your changes
 */

// TODO: Names will not be shortened until this is set to a non-zero number
export const MAX_DB_IDENTIFIER_LENGTH = 0;

// We will have 55 total length available
// That means we can accept a number of compressible tokens up to:
// tokens accepted = (MAX_LENGTH / (HASH_LENGTH + MIN_TOKEN_LENGTH) + (tokens * IDENTIFIER_SEPARATER.length))
export const HASH_LENGTH = 5;
export const HASH_SEPARATOR = ''; // no separator is needed, we will just attach hash directly to shortened name
export const IDENTIFIER_SEPARATOR = '_';
export const MIN_TOKEN_LENGTH = 3;

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
    throw new Error(`createHash length must be a positive integer, received ${len}`);
  }

  // TODO: shake256 is based on SHA-3 and is slow, we don't care about cryptographically secure, only uniqueness and speed
  //       investigate alternatives before releasing this. But it is only run on startup, so it should be fine.
  const hash = crypto.createHash('shake256', { outputLength: Math.ceil(len / 2) }).update(data);
  return hash.digest('hex').substring(0, len);
}

export function tokenWithHash(name: string, len: number) {
  if (!_.isInteger(len) || len <= 0) {
    throw new Error(`tokenWithHash length must be a positive integer, received ${len}`);
  }
  if (name.length <= len) {
    return name;
  }
  if (len < MIN_TOKEN_LENGTH + HASH_LENGTH) {
    throw new Error(
      `length for part of identifier too short, minimum is hash length (${HASH_LENGTH}) plus min token length (${MIN_TOKEN_LENGTH}), received ${len} for token ${name}`
    );
  }

  const availableLength = len - HASH_LENGTH - HASH_SEPARATOR.length;
  if (availableLength < MIN_TOKEN_LENGTH) {
    throw new Error(
      `length for part of identifier minimum is less than min token length (${MIN_TOKEN_LENGTH}), received ${len} for token ${name}`
    );
  }

  return `${name.substring(0, availableLength)}${HASH_SEPARATOR}${createHash(name, HASH_LENGTH)}`;
}

export function getNameFromTokens(nameTokens: NameToken[], maxLength = MAX_DB_IDENTIFIER_LENGTH) {
  if (!_.isInteger(maxLength) || maxLength < 0) {
    throw new Error('maxLength must be a positive integer or 0 to disable');
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

  const fullLengthName = nameTokens.map((token) => token.name).join(IDENTIFIER_SEPARATOR);
  if (fullLengthName.length <= maxLength) {
    return fullLengthName;
  }

  const incompressibleLength = incompressible.reduce((sum, token) => sum + token.name.length, 0);
  const separatorsLength = nameTokens.length * IDENTIFIER_SEPARATOR.length - 1;
  if (incompressibleLength + separatorsLength > maxLength) {
    throw new Error('incompressible string length greater than maxLength');
  }

  const available = maxLength - incompressibleLength - separatorsLength;

  // Calculate available length per compressible token
  const availablePerToken = Math.floor(available / compressible.length);

  // Calculate the remainder from the division and add it to the surplus
  let surplus = available % compressible.length;

  // Check that it's even possible to proceed
  const totalLength = nameTokens.reduce((total, token) => {
    if (token.compressible) {
      if (token.name.length < availablePerToken) {
        return total + token.name.length;
      }
      return total + HASH_LENGTH + MIN_TOKEN_LENGTH;
    }
    return total + token.name.length;
  }, nameTokens.length * IDENTIFIER_SEPARATOR.length - 1);

  // Check if the maximum length is less than the total length
  if (maxLength < totalLength) {
    throw new Error('Maximum length is too small to accommodate all tokens');
  }

  // Calculate total surplus length from shorter strings and total deficit length from longer strings
  let deficits: NameToken[] = [];
  compressible.forEach((token) => {
    const actualLength = token.name.length;
    if (actualLength < availablePerToken) {
      surplus += availablePerToken - actualLength;
      token.allocatedLength = actualLength;
    } else {
      token.allocatedLength = availablePerToken;
      deficits.push(token);
    }
  });

  // Redistribute surplus length to longer strings, one character at a time
  // This way we avoid issues with greed and trying to handle floating points by dividing available length
  function filterAndIncreaseLength(token: NameToken) {
    if (token.allocatedLength! < token.name.length && surplus > 0) {
      token.allocatedLength! += 1;
      surplus -= 1;
      return true; // Keep this token in the deficits array for the next round
    }
    return false; // Remove this token from the deficits array
  }

  // Redistribute surplus length to longer strings, one character at a time
  let previousSurplus = surplus + 1; // infinite loop protection
  while (surplus > 0 && deficits.length > 0) {
    deficits = deficits.filter((token) => filterAndIncreaseLength(token));

    // infinite loop protection; if the surplus hasn't changed, there's nothing left to distribute it to
    if (surplus === previousSurplus) {
      break;
    }
    previousSurplus = surplus;
  }

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
    .join(IDENTIFIER_SEPARATOR);

  if (shortenedName.length > maxLength) {
    throw new Error(
      `name shortening failed to generate a name of the correct maxLength; name ${shortenedName}`
    );
  }

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
