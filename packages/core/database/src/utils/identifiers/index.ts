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
import _, { isInteger, partition, snakeCase, sumBy } from 'lodash/fp';
import { createHash } from './hash';
import {
  IdentifiersOptions,
  NameInput,
  NameOptions,
  NameToken,
  NameTokenWithAllocation,
} from './types';

const IDENTIFIER_MAX_LENGTH = 55 as const;

export class Identifiers {
  ID_COLUMN = 'id' as const;

  ORDER_COLUMN = 'order' as const;

  FIELD_COLUMN = 'field' as const;

  HASH_LENGTH = 5 as const;

  HASH_SEPARATOR = '' as const; // no separator is needed, we will just attach hash directly to shortened name

  IDENTIFIER_SEPARATOR = '_' as const;

  MIN_TOKEN_LENGTH = 3 as const; // the min characters required at the beginning of a name part

  // Fixed compression map for suffixes and prefixes
  #replacementMap = {
    links: 'lnk',
    order_inv_fk: 'oifk',
    order: 'ord',
    morphs: 'mph',
    index: 'idx',
    inv_fk: 'ifk',
    order_fk: 'ofk',
    id_column_index: 'idix',
    order_index: 'oidx',
    unique: 'uq',
    primary: 'pk',
  };

  #options: IdentifiersOptions;

  constructor(options: { maxLength: number }) {
    this.#options = options;
  }

  get replacementMap() {
    return this.#replacementMap;
  }

  get options() {
    return this.#options;
  }

  mapshortNames = (name: string): string | undefined => {
    if (name in this.replacementMap) {
      return (this.replacementMap as any)[name];
    }
    return undefined;
  };

  // Generic name handler that must be used by all helper functions
  /**
   * TODO: we should be requiring snake_case inputs for all names here, but we
   * aren't and it will require some refactoring to make it work. Currently if
   * we get names 'myModel' and 'my_model' they would be converted to the same
   * final string my_model which generally works but is not entirely safe
   * */
  getName = (names: NameInput, options?: NameOptions) => {
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
        shortName: this.mapshortNames(options.suffix),
      });
    }

    if (options?.prefix) {
      tokens.unshift({
        name: options.prefix,
        compressible: false,
        shortName: this.mapshortNames(options.prefix),
      });
    }

    return this.getNameFromTokens(tokens);
  };

  /**
   * TABLES
   */

  getTableName = (name: string, options?: NameOptions) => {
    return this.getName(name, options);
  };

  getJoinTableName = (collectionName: string, attributeName: string, options?: NameOptions) => {
    return this.getName([collectionName, attributeName], {
      suffix: 'links',
      ...options,
    });
  };

  getMorphTableName = (collectionName: string, attributeName: string, options?: NameOptions) => {
    return this.getName([snakeCase(collectionName), snakeCase(attributeName)], {
      suffix: 'morphs',
      ...options,
    });
  };

  /**
   * COLUMNS
   */

  getColumnName = (attributeName: string, options?: NameOptions) => {
    return this.getName(attributeName, options);
  };

  getJoinColumnAttributeIdName = (attributeName: string, options?: NameOptions) => {
    return this.getName(attributeName, { suffix: 'id', ...options });
  };

  getInverseJoinColumnAttributeIdName = (attributeName: string, options?: NameOptions) => {
    return this.getName(snakeCase(attributeName), { suffix: 'id', prefix: 'inv', ...options });
  };

  getOrderColumnName = (singularName: string, options?: NameOptions) => {
    return this.getName(singularName, { suffix: 'order', ...options });
  };

  getInverseOrderColumnName = (singularName: string, options?: NameOptions) => {
    return this.getName(singularName, {
      suffix: 'order',
      prefix: 'inv',
      ...options,
    });
  };

  /**
   * Morph Join Tables
   */
  getMorphColumnJoinTableIdName = (singularName: string, options?: NameOptions) => {
    return this.getName(snakeCase(singularName), { suffix: 'id', ...options });
  };

  getMorphColumnAttributeIdName = (attributeName: string, options?: NameOptions) => {
    return this.getName(snakeCase(attributeName), { suffix: 'id', ...options });
  };

  getMorphColumnTypeName = (attributeName: string, options?: NameOptions) => {
    return this.getName(snakeCase(attributeName), { suffix: 'type', ...options });
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
   */

  // base index types
  getIndexName = (names: NameInput, options?: NameOptions) => {
    return this.getName(names, { suffix: 'index', ...options });
  };

  getFkIndexName = (names: NameInput, options?: NameOptions) => {
    return this.getName(names, { suffix: 'fk', ...options });
  };

  getUniqueIndexName = (names: NameInput, options?: NameOptions) => {
    return this.getName(names, { suffix: 'unique', ...options });
  };

  getPrimaryIndexName = (names: NameInput, options?: NameOptions) => {
    return this.getName(names, { suffix: 'primary', ...options });
  };

  // custom index types
  getInverseFkIndexName = (names: NameInput, options?: NameOptions) => {
    return this.getName(names, { suffix: 'inv_fk', ...options });
  };

  getOrderFkIndexName = (names: NameInput, options?: NameOptions) => {
    return this.getName(names, { suffix: 'order_fk', ...options });
  };

  getOrderInverseFkIndexName = (names: NameInput, options?: NameOptions) => {
    return this.getName(names, { suffix: 'order_inv_fk', ...options });
  };

  getIdColumnIndexName = (names: NameInput, options?: NameOptions) => {
    return this.getName(names, { suffix: 'id_column_index', ...options });
  };

  getOrderIndexName = (names: NameInput, options?: NameOptions) => {
    return this.getName(names, { suffix: 'order_index', ...options });
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
  getShortenedName = (name: string, len: number) => {
    if (!isInteger(len) || len <= 0) {
      throw new Error(`tokenWithHash length must be a positive integer, received ${len}`);
    }
    if (name.length <= len) {
      return name;
    }
    if (len < this.MIN_TOKEN_LENGTH + this.HASH_LENGTH) {
      throw new Error(
        `length for part of identifier too short, minimum is hash length (${this.HASH_LENGTH}) plus min token length (${this.MIN_TOKEN_LENGTH}), received ${len} for token ${name}`
      );
    }

    const availableLength = len - this.HASH_LENGTH - this.HASH_SEPARATOR.length;
    if (availableLength < this.MIN_TOKEN_LENGTH) {
      throw new Error(
        `length for part of identifier minimum is less than min token length (${this.MIN_TOKEN_LENGTH}), received ${len} for token ${name}`
      );
    }

    return `${name.substring(0, availableLength)}${this.HASH_SEPARATOR}${createHash(
      name,
      this.HASH_LENGTH
    )}`;
  };

  /**
   * Constructs a name from an array of name tokens within a specified maximum length. It ensures the final name does not exceed
   * this limit by selectively compressing tokens marked as compressible. If the name exceeds the maximum length and cannot be
   * compressed sufficiently, an error is thrown. This function supports dynamic adjustment of token lengths to fit within the
   * maxLength constraint (that is, it will always make use of all available space), while also ensuring the preservation of
   * incompressible tokens.
   * @internal
   */
  getNameFromTokens = (nameTokens: NameToken[]): string => {
    const { maxLength } = this.options;

    if (!isInteger(maxLength) || maxLength < 0) {
      throw new Error('maxLength must be a positive integer or 0 (for unlimited length)');
    }

    const unshortenedName = nameTokens
      .map((token) => {
        return token.name;
      })
      .join(this.IDENTIFIER_SEPARATOR);

    // if maxLength == 0 we want the legacy v4 name without any shortening
    if (maxLength === 0) {
      this.setUnshortenedName(unshortenedName, unshortenedName);
      return unshortenedName;
    }

    // check the full length name (but with incompressible tokens using shortNames if available)
    const fullLengthName = nameTokens
      .map((token) => {
        if (token.compressible) {
          return token.name;
        }
        return token.shortName ?? token.name;
      })
      .join(this.IDENTIFIER_SEPARATOR);

    if (fullLengthName.length <= maxLength) {
      this.setUnshortenedName(fullLengthName, unshortenedName);
      return fullLengthName;
    }

    // Split tokens by compressibility
    const [compressible, incompressible] = partition(
      (token: NameToken) => token.compressible,
      nameTokens
    );

    const totalIncompressibleLength = sumBy((token: NameToken) =>
      token.compressible === false && token.shortName !== undefined
        ? token.shortName.length
        : token.name.length
    )(incompressible);
    const totalSeparatorsLength = nameTokens.length * this.IDENTIFIER_SEPARATOR.length - 1;
    const available = maxLength - totalIncompressibleLength - totalSeparatorsLength;
    const availablePerToken = Math.floor(available / compressible.length);

    if (
      totalIncompressibleLength + totalSeparatorsLength > maxLength ||
      availablePerToken < this.MIN_TOKEN_LENGTH
    ) {
      throw new Error('Maximum length is too small to accommodate all tokens');
    }

    // Calculate the remainder from the division and add it to the surplus
    let surplus = available % compressible.length;

    // Check that it's even possible to proceed
    const minHashedLength = this.HASH_LENGTH + this.HASH_SEPARATOR.length + this.MIN_TOKEN_LENGTH;
    const totalLength = nameTokens.reduce(
      (total, token) => {
        if (token.compressible) {
          if (token.name.length < availablePerToken) {
            return total + token.name.length;
          }
          return total + minHashedLength;
        }
        const tokenName = token.shortName ?? token.name;
        return total + tokenName.length;
      },
      nameTokens.length * this.IDENTIFIER_SEPARATOR.length - 1
    );

    // TODO: this is the weakest thing of the shortener, but fortunately it can be improved later without a breaking change if it turns out to be a problem (for example, if there is some case we need 6+ name parts in one identifier). We could take this "shortest string we could generate" that is too long and apply the hash directly to that, which would work fine even though it would be very difficult to determine what it was actually referring to
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
        if (
          token.compressible &&
          'allocatedLength' in token &&
          token.allocatedLength !== undefined
        ) {
          return this.getShortenedName(token.name, token.allocatedLength);
        }

        // if is is only compressible as a fixed value, use that
        if (token.compressible === false && token.shortName) {
          return token.shortName;
        }

        // otherwise return it as-is
        return token.name;
      })
      .join(this.IDENTIFIER_SEPARATOR);

    // this should be unreachable, but add a final check for potential edge cases we missed
    if (shortenedName.length > maxLength) {
      throw new Error(
        `name shortening failed to generate a name of the correct maxLength; name ${shortenedName}`
      );
    }

    this.setUnshortenedName(shortenedName, unshortenedName);
    return shortenedName;
  };

  // We need to be able to find the full-length name for any shortened name, primarily for migration purposes
  // Therefore we store every name that passes through so we can retrieve the original later
  nameMap = new Map<string, string>();

  getUnshortenedName = (shortName: string) => {
    return this.nameMap.get(this.serializeKey(shortName)) ?? shortName;
  };

  setUnshortenedName = (shortName: string, fullName: string) => {
    // This is protection against cases where a name is shortened twice, for example shortened in a model outside of createMetadata
    // and then run through the shortener against inside createMetadata, which would do nothing at all but replace the original
    // name in this mapping
    if (this.nameMap.get(this.serializeKey(shortName)) && shortName === fullName) {
      return;
    }

    // set the name
    this.nameMap.set(this.serializeKey(shortName), fullName);
  };

  serializeKey = (shortName: string) => {
    return `${shortName}.${this.options.maxLength}`;
  };
}

// TODO: instead of instantiating this here as a global metadata should create its own to use
// However, that would require refactoring all of the metadata methods to be instantiated to keep a centralized identifiers
export const identifiers = new Identifiers({ maxLength: IDENTIFIER_MAX_LENGTH });
