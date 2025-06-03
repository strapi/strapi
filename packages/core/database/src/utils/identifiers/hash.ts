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
import { isInteger } from 'lodash/fp';

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
