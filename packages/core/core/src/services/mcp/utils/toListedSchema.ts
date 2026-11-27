import type { StandardSchemaWithJSON } from '@modelcontextprotocol/server';
import { z } from '@strapi/utils';

// Same checks as the SDK's `isStandardSchema` and `isZodRawShape` (@modelcontextprotocol/server@2.3.1).
export const isStandardSchema = (value: unknown): value is StandardSchemaWithJSON =>
  (typeof value === 'object' || typeof value === 'function') &&
  value !== null &&
  '~standard' in value &&
  typeof (value as { '~standard'?: { validate?: unknown } })['~standard']?.validate === 'function';

const isRawZodShape = (value: unknown): value is z.ZodRawShape => {
  if (typeof value !== 'object' || value === null || isStandardSchema(value)) {
    return false;
  }

  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    return false;
  }

  return Object.values(value).every(
    (field) => typeof field === 'object' && field !== null && '_zod' in field
  );
};

/**
 * Returns the schema the SDK will list for `schema`: the SDK wraps a raw Zod shape with
 * `z.object()` at registration. Registering the returned value lets a probe and the SDK convert
 * the same schema. Any other value is returned as is, and the SDK validates it at registration.
 */
export const toListedSchema = <T>(schema: T): T =>
  (isRawZodShape(schema) ? z.object(schema) : schema) as T;
