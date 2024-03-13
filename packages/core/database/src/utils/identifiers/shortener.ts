/**
 * @fileoverview This file contains utility functions for shortening identifiers for use in a database schema.
 * The functions in this file are used to generate shorter names for database tables and columns
 * to avoid breaking the constraints of databases.
 *
 * IMPORTANT
 * Any changes here that result in a different output string from any of the naming methods will
 * cause the schema creation to delete data it doesn't recognize because the name
 * is different.
 *
 * If there are any test failures after updating this code, it means there is a breaking change that
 * will cause data loss, so beware; do not update the test to match your changes
 *
 * @internal
 */

import crypto from 'node:crypto';
import { partition, isInteger, sumBy, snakeCase } from 'lodash/fp';

// We can accept a number of compressible tokens up to:
// tokens accepted = (MAX_LENGTH / (HASH_LENGTH + MIN_TOKEN_LENGTH) + (tokens * IDENTIFIER_SEPARATER.length))
// Be aware of that when considering changing these values, we should be able to support at least 4 compressible identifiers

export const HASH_LENGTH = 5;
export const HASH_SEPARATOR = ''; // no separator is needed, we will just attach hash directly to shortened name
export const IDENTIFIER_SEPARATOR = '_';
export const MIN_TOKEN_LENGTH = 3;

export type NameToken = {
  allocatedLength?: number;
  name: string;
  compressible: boolean;
  shortForm?: string; // if compressible is false but maxLength > 0, use this
};

type NameTokenWithAllocation = NameToken & { allocatedLength: number };

export type NameFromTokenOptions = {
  maxLength: number;
  snakeCase?: boolean;
};

/**
 * Creates a hash of the given data with the specified string length as a string of hex characters
 *
 * @example
 * createHash("myData", 5); // "03f85"
 * createHash("myData", 2); // "03"
 * createHash("myData", 1); // "0"
 *
 * @param data - The data to be hashed
 * @param len - The length of the hash
 * @returns The generated hash
 * @throws Error if the length is not a positive integer
 * @internal
 */
export function createHash(data: string, len: number): string {
  if (!isInteger(len) || len <= 0) {
    throw new Error(`createHash length must be a positive integer, received ${len}`);
  }

  const hash = crypto.createHash('shake256', { outputLength: Math.ceil(len / 2) }).update(data);
  return hash.digest('hex').substring(0, len);
}

// We need to be able to find the full-length name for any shortened name, primarily for migration purposes
// Therefore we store every name that passes through so we can retrieve the original later
const nameMap = new Map<string, string>();
export const getUnshortenedName = (shortName: string, options: NameFromTokenOptions) => {
  return nameMap.get(serializeKey(shortName, options));
};

export const setUnshortenedName = (
  shortName: string,
  options: NameFromTokenOptions,
  fullName: string
) => {
  // This is protection against cases where a name is shortened twice, for example shortened in a model outside of createMetadata
  // and then run through the shortener against inside createMetadata, which would do nothing at all but replace the original
  // name in this mapping
  if (nameMap.get(serializeKey(shortName, options)) && shortName === fullName) {
    return;
  }

  // set the name
  nameMap.set(serializeKey(shortName, options), fullName);
};

const serializeKey = (shortName: string, options: NameFromTokenOptions) => {
  return `${shortName}.${options.maxLength}`;
};
/**
 * Generates a string with a max length, appending a hash at the end if necessary to keep it unique
 *
 * @example
 * // if we have strings such as "longstring1" and "longstring2" with a max length of 9,
 * // we don't want to end up with "longstrin" and "longstrin"
 * // we want something such as    "longs0b23" and "longs953f"
 * const token1 = generateToken("longstring1", 9); // "longs0b23"
 * const token2 = generateToken("longstring2", 9); // "longs953f"
 *
 * @param name - The base name
 * @param len - The desired length of the token.
 * @returns The generated token with hash.
 * @throws Error if the length is not a positive integer, or if the length is too short for the token.
 * @internal
 */
export function getShortenedName(name: string, len: number) {
  if (!isInteger(len) || len <= 0) {
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

/**
 * Constructs a name from an array of name tokens within a specified maximum length. It ensures the final name does not exceed
 * this limit by selectively compressing tokens marked as compressible. If the name exceeds the maximum length and cannot be
 * compressed sufficiently, an error is thrown. This function supports dynamic adjustment of token lengths to fit within the
 * maxLength constraint (that is, it will always make use of all available space), while also ensuring the preservation of
 * incompressible tokens.
 *
 * @param {NameToken[]} nameTokens - Array of name tokens
 * @param {number} [maxLength] - Maximum length for the final name string.
 * @returns {string} The generated name string within maxLength.
 * @throws {Error} If the name cannot be shortened to meet maxLength.
 * @internal
 */
export function getNameFromTokens(nameTokens: NameToken[], options: NameFromTokenOptions) {
  const { maxLength } = options;

  if (!isInteger(maxLength) || maxLength < 0) {
    throw new Error('maxLength must be a positive integer or 0 (for unlimited length)');
  }

  const unshortenedName = nameTokens
    .map((token) => {
      if (token.compressible) {
        return options.snakeCase === false ? token.name : snakeCase(token.name);
      }
      return token.name;
    })
    .join(IDENTIFIER_SEPARATOR);

  // if maxLength == 0 we want the legacy v4 name without any shortening
  if (maxLength === 0) {
    setUnshortenedName(unshortenedName, options, unshortenedName);
    return unshortenedName;
  }

  // check the full length name (but with incompressible tokens using shortForms if available)
  const fullLengthName = nameTokens
    .map((token) => {
      if (token.compressible) {
        return options.snakeCase === false ? token.name : snakeCase(token.name);
      }
      return token.shortForm ?? token.name;
    })
    .join(IDENTIFIER_SEPARATOR);

  if (fullLengthName.length <= maxLength) {
    setUnshortenedName(fullLengthName, options, unshortenedName);
    return fullLengthName;
  }

  // Split tokens by compressibility
  const [compressible, incompressible] = partition(
    (token: NameToken) => token.compressible,
    nameTokens
  );

  const totalIncompressibleLength = sumBy((token: NameToken) =>
    token.shortForm !== undefined ? token.shortForm.length : token.name.length
  )(incompressible);
  const totalSeparatorsLength = nameTokens.length * IDENTIFIER_SEPARATOR.length - 1;
  const available = maxLength - totalIncompressibleLength - totalSeparatorsLength;
  const availablePerToken = Math.floor(available / compressible.length);

  if (
    totalIncompressibleLength + totalSeparatorsLength > maxLength ||
    availablePerToken < MIN_TOKEN_LENGTH
  ) {
    throw new Error('Maximum length is too small to accommodate all tokens');
  }

  // Calculate the remainder from the division and add it to the surplus
  let surplus = available % compressible.length;

  // Check that it's even possible to proceed
  const minHashedLength = HASH_LENGTH + HASH_SEPARATOR.length + MIN_TOKEN_LENGTH;
  const totalLength = nameTokens.reduce((total, token) => {
    if (token.compressible) {
      if (token.name.length < availablePerToken) {
        return total + token.name.length;
      }
      return total + minHashedLength;
    }
    const tokenName = token.shortForm ?? token.name;
    return total + tokenName.length;
  }, nameTokens.length * IDENTIFIER_SEPARATOR.length - 1);

  // Check if the maximum length is less than the total length
  if (maxLength < totalLength) {
    throw new Error('Maximum length is too small to accommodate all tokens');
  }

  // Calculate total surplus length from shorter strings and total deficit length from longer strings
  let deficits: NameTokenWithAllocation[] = [];
  compressible.forEach((token) => {
    const actualLength = token.name.length;
    if (actualLength < availablePerToken) {
      surplus += availablePerToken - actualLength;
      token.allocatedLength = actualLength;
    } else {
      token.allocatedLength = availablePerToken;
      deficits.push(token as NameTokenWithAllocation);
    }
  });

  // Redistribute surplus length to longer strings, one character at a time
  // This way we avoid issues with greed and trying to handle floating points by dividing available length
  function filterAndIncreaseLength(token: NameTokenWithAllocation) {
    if (token.allocatedLength < token.name.length && surplus > 0) {
      token.allocatedLength += 1;
      surplus -= 1;
      // if it hasn't reached its full length, keep it in array for next round
      return token.allocatedLength < token.name.length;
    }
    return false; // Remove this token from the deficits array
  }

  // Redistribute surplus length to longer strings, one character at a time
  let previousSurplus = surplus + 1; // infinite loop protection
  while (surplus > 0 && deficits.length > 0) {
    deficits = deficits.filter((token) => filterAndIncreaseLength(token));

    // infinite loop protection; if the surplus hasn't changed, there was nothing left to distribute it to
    if (surplus === previousSurplus) {
      break;
    }
    previousSurplus = surplus;
  }

  // Build final string
  const shortenedName = nameTokens
    .map((token) => {
      // if it is compressible, shorten it
      if (token.compressible && 'allocatedLength' in token && token.allocatedLength !== undefined) {
        return getShortenedName(token.name, token.allocatedLength);
      }

      // if is is only compressible as a fixed value, use that
      if (token.shortForm) {
        return token.shortForm;
      }

      // otherwise return it as-is
      return token.name;
    })
    .join(IDENTIFIER_SEPARATOR);

  // this should be unreachable, but add a final check for potential edge cases we missed
  if (shortenedName.length > maxLength) {
    throw new Error(
      `name shortening failed to generate a name of the correct maxLength; name ${shortenedName}`
    );
  }

  setUnshortenedName(shortenedName, options, unshortenedName);
  return shortenedName;
}
