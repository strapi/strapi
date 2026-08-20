import * as z4 from 'zod/v4/core';

type ZodSchemaInspection =
  | { type: 'array'; element: z4.$ZodType }
  | { type: 'optional' | 'default'; innerType: z4.$ZodType }
  | { type: 'object'; shape: z4.$ZodShape }
  | {
      type: Exclude<z4.$ZodTypeDef['type'], 'array' | 'optional' | 'default' | 'object'>;
    };

/**
 * Checks whether an unknown value exposes the Zod 4 Core schema contract.
 */
export const isZodType = (value: unknown): value is z4.$ZodType => {
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
export const inspectZodSchema = <T extends z4.$ZodType>(schema: T): ZodSchemaInspection => {
  const def = schema._zod.def;

  switch (def.type) {
    case 'array':
      return { type: def.type, element: (def as z4.$ZodArrayDef).element };
    case 'optional':
      return { type: def.type, innerType: (def as z4.$ZodOptionalDef).innerType };
    case 'default':
      return { type: def.type, innerType: (def as z4.$ZodDefaultDef).innerType };
    case 'object':
      return { type: def.type, shape: (def as z4.$ZodObjectDef).shape };
    default:
      return { type: def.type };
  }
};
