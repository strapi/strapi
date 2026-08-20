import * as z from 'zod';

import { inspectZodSchema, isZodType } from '../zod';

describe('Zod inspection utilities', () => {
  test('identifies Zod 4 Core schemas', () => {
    expect(isZodType(z.string())).toBe(true);
    expect(isZodType({})).toBe(false);
    expect(isZodType(null)).toBe(false);
  });

  test('exposes wrapper and collection schemas through Core definitions', () => {
    const stringSchema = z.string();
    const arrayInspection = inspectZodSchema(z.array(stringSchema));
    const optionalInspection = inspectZodSchema(stringSchema.optional());
    const defaultInspection = inspectZodSchema(stringSchema.default('value'));
    const objectInspection = inspectZodSchema(z.object({ value: stringSchema }));

    expect(arrayInspection).toEqual({ type: 'array', element: stringSchema });
    expect(optionalInspection).toEqual({ type: 'optional', innerType: stringSchema });
    expect(defaultInspection).toEqual({ type: 'default', innerType: stringSchema });
    expect(objectInspection).toEqual({ type: 'object', shape: { value: stringSchema } });
  });

  test('returns the schema type for schemas without structural fields', () => {
    expect(inspectZodSchema(z.string())).toEqual({ type: 'string' });
  });
});
