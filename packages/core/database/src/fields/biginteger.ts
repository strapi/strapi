import { toString } from 'lodash/fp';
import Field from './field';

/**
 * BigIntegerField handles bigint columns from the database.
 *
 * For internal columns (IDs, relation FKs), we convert to numbers for backwards
 * compatibility. We validate that values don't exceed JavaScript's
 * MAX_SAFE_INTEGER (2^53 - 1) to ensure precision.
 *
 * For user-defined biginteger attributes, we keep the string representation
 * to avoid breaking changes and precision loss for large numbers.
 */
export default class BigIntegerField extends Field {
  toDB(value: unknown) {
    return toString(value);
  }

  fromDB(value: unknown): number | string {
    // Internal columns (IDs and FK columns) are cast to numbers
    // - type 'increments' or 'bigincrements' is used for ID columns
    // - internalIntegerId flag marks FK columns in join tables
    const isInternalColumn =
      this.attribute.type === 'increments' ||
      this.attribute.type === 'bigincrements' ||
      ('internalIntegerId' in this.attribute && this.attribute.internalIntegerId === true);

    if (isInternalColumn) {
      return this.toNumber(value);
    }

    // User-defined biginteger attributes return as string (backwards compatible)
    return this.toString(value);
  }

  /**
   * Converts a bigint value to a string representation.
   * Used for user-defined biginteger attributes to preserve precision.
   */
  private toString(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }

    return toString(value);
  }

  /**
   * Converts a bigint value to a number.
   * Used for internal columns (IDs, FKs) where we expect values within safe integer range.
   * Throws if the value exceeds MAX_SAFE_INTEGER.
   */
  private toNumber(value: unknown): number {
    let numberValue: number;

    // Optimize for the hot path: Knex returns bigint as strings
    if (typeof value === 'string') {
      numberValue = Number(value);
    } else if (typeof value === 'number') {
      numberValue = value;
    } else {
      // Fallback for unexpected types
      numberValue = Number(String(value));
    }

    // Validate conversion succeeded
    if (Number.isNaN(numberValue)) {
      throw new Error(`Cannot convert value "${value}" to a valid number`);
    }

    // Check for overflow beyond MAX_SAFE_INTEGER
    if (!Number.isSafeInteger(numberValue)) {
      throw new Error(
        `BigInt value ${value} exceeds JavaScript's MAX_SAFE_INTEGER (${Number.MAX_SAFE_INTEGER}). ` +
          `This may indicate data corruption or an ID overflow.`
      );
    }

    return numberValue;
  }
}
