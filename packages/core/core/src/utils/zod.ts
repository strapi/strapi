import type * as z from 'zod';

type ZodSchemaInspection =
  | { type: 'array'; element: z.core.$ZodType }
  | { type: 'optional' | 'default'; innerType: z.core.$ZodType }
  | { type: 'object'; shape: z.core.$ZodShape }
  | {
      type: Exclude<z.core.$ZodTypeDef['type'], 'array' | 'optional' | 'default' | 'object'>;
    };

/**
 * Checks whether an unknown value exposes the Zod 4 Core schema contract.
 */
export const isZodType = (value: unknown): value is z.core.$ZodType => {
  if (typeof value !== 'object' || value === null || !('_zod' in value)) {
    return false;
  }

  const internals = value._zod;

  return (
    typeof internals === 'object' &&
    internals !== null &&
    'def' in internals &&
    typeof internals.def === 'object' &&
    internals.def !== null &&
    'type' in internals.def &&
    typeof internals.def.type === 'string'
  );
};

/**
 * Reads the supported structural fields from a Zod 4 Core schema definition.
 */
export const inspectZodSchema = <T extends z.core.$ZodType>(schema: T): ZodSchemaInspection => {
  const def = schema._zod.def;

  switch (def.type) {
    case 'array':
      return { type: def.type, element: (def as z.core.$ZodArrayDef).element };
    case 'optional':
      return { type: def.type, innerType: (def as z.core.$ZodOptionalDef).innerType };
    case 'default':
      return { type: def.type, innerType: (def as z.core.$ZodDefaultDef).innerType };
    case 'object':
      return { type: def.type, shape: (def as z.core.$ZodObjectDef).shape };
    default:
      return { type: def.type };
  }
};
