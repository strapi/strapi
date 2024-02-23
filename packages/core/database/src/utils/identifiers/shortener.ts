import crypto from 'node:crypto';
import _ from 'lodash/fp';

/**
 * IMPORTANT
 * Any changes here that result in a different output string from any of the naming methods will
 * cause the schema creation on Strapi bootstrap to delete data it doesn't recognize because the name
 * is different.
 *
 * If there are any test failures after updating this code, it means there is a breaking change that
 * will cause data loss, so beware; do not update the test to match your changes
 */

// TODO: Names will not be shortened until this is set to a non-zero number (most likely 55)
export const MAX_DB_IDENTIFIER_LENGTH = 0;

// We can accept a number of compressible tokens up to:
// tokens accepted = (MAX_LENGTH / (HASH_LENGTH + MIN_TOKEN_LENGTH) + (tokens * IDENTIFIER_SEPARATER.length))
// Be aware of that when considering changing these values, we should be able to support at least 4 compressible identifiers

export const HASH_LENGTH = 5;
export const HASH_SEPARATOR = ''; // no separator is needed, we will just attach hash directly to shortened name
export const IDENTIFIER_SEPARATOR = '_';
export const MIN_TOKEN_LENGTH = 3;

type NameToken = {
  allocatedLength?: number;
  name: string;
  compressible: boolean;
};

type NameTokenWithAllocation = NameToken & { allocatedLength: number };

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
  if (!_.isInteger(len) || len <= 0) {
    throw new Error(`createHash length must be a positive integer, received ${len}`);
  }

  // TODO: shake256 is based on SHA-3 and is slow, we don't care about cryptographically secure, only uniqueness and speed
  //       investigate alternatives before releasing this. But it is only run on startup, so it should be fine.
  const hash = crypto.createHash('shake256', { outputLength: Math.ceil(len / 2) }).update(data);
  return hash.digest('hex').substring(0, len);
}

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
 */
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
    throw new Error('maxLength must be a positive integer or 0 (for unlimited length)');
  }

  // Ensure all tokens are in snake_case
  nameTokens.forEach((token) => {
    if (token.name !== _.snakeCase(token.name)) {
      throw new Error(`all names must already be in snake_case; received ${token.name}`);
    }
  });

  const fullLengthName = nameTokens.map((token) => token.name).join(IDENTIFIER_SEPARATOR);

  // if it fits, or maxLength is disabled, return full length string
  if (fullLengthName.length <= maxLength || maxLength === 0) {
    return fullLengthName;
  }

  // Split tokens by compressibility
  const { compressible, incompressible } = nameTokens.reduce(
    (acc: { compressible: NameToken[]; incompressible: NameToken[] }, token) => {
      acc[token.compressible ? 'compressible' : 'incompressible'].push(token);
      return acc;
    },
    { compressible: [], incompressible: [] }
  );

  const totalIncompressibleLength = incompressible.reduce(
    (sum, token) => sum + token.name.length,
    0
  );
  const totalSeparatorsLength = nameTokens.length * IDENTIFIER_SEPARATOR.length - 1;
  if (totalIncompressibleLength + totalSeparatorsLength > maxLength) {
    throw new Error('incompressible string length greater than maxLength');
  }

  const available = maxLength - totalIncompressibleLength - totalSeparatorsLength;

  // Calculate available length per compressible token
  const availablePerToken = Math.floor(available / compressible.length);

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
    return total + token.name.length;
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
      return true; // Keep this token in the deficits array for the next round
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
      if (token.compressible && 'allocatedLength' in token && token.allocatedLength !== undefined) {
        return tokenWithHash(token.name, token.allocatedLength);
      }
      return token.name;
    })
    .join(IDENTIFIER_SEPARATOR);

  // this should be unreachable, but add a final check for potential edge cases we missed
  if (shortenedName.length > maxLength) {
    throw new Error(
      `name shortening failed to generate a name of the correct maxLength; name ${shortenedName}`
    );
  }

  return shortenedName;
}
