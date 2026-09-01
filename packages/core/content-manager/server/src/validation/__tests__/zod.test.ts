import { z, errors } from '@strapi/utils';
import { formatZodErrors, strapiID, validateZodAsync } from '../zod';

describe('formatZodErrors', () => {
  it('formats a single field error', () => {
    const schema = z.object({
      name: z.string(),
    });

    const result = schema.safeParse({ name: 123 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const formatted = formatZodErrors(result.error);
      expect(formatted).toMatchObject({
        errors: [
          {
            path: ['name'],
            message: expect.any(String),
            name: 'ValidationError',
            value: undefined,
          },
        ],
        message: result.error.issues[0].message,
      });
    }
  });

  it('formats multiple field errors', () => {
    const schema = z.object({
      name: z.string(),
      price: z.number().int(),
    });

    const result = schema.safeParse({ name: 123, price: 'abc' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const formatted = formatZodErrors(result.error);
      expect(formatted.errors).toHaveLength(2);
      expect(formatted.errors[0]).toMatchObject({
        path: ['name'],
        message: expect.any(String),
        name: 'ValidationError',
      });
      expect(formatted.errors[1]).toMatchObject({
        path: ['price'],
        message: expect.any(String),
        name: 'ValidationError',
      });
      expect(formatted.message).toBe(result.error.issues[0].message);
    }
  });

  it('formats nested path errors', () => {
    const schema = z.object({
      address: z.object({
        street: z.string(),
      }),
    });

    const result = schema.safeParse({ address: { street: 42 } });
    expect(result.success).toBe(false);
    if (!result.success) {
      const formatted = formatZodErrors(result.error);
      expect(formatted.errors[0]).toMatchObject({
        path: ['address', 'street'],
        message: expect.any(String),
        name: 'ValidationError',
      });
    }
  });

  it('deduplicates errors per path (keeps first only)', () => {
    const schemaWithMultiple = z.object({
      name: z.string().superRefine((val, ctx) => {
        ctx.addIssue({ code: 'custom', message: 'error one' });
        ctx.addIssue({ code: 'custom', message: 'error two' });
      }),
    });

    const result = schemaWithMultiple.safeParse({ name: 'test' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const formatted = formatZodErrors(result.error);
      const namePaths = formatted.errors.filter((e) => e.path.length === 1 && e.path[0] === 'name');
      expect(namePaths).toHaveLength(1);
      expect(namePaths[0].message).toBe('error one');
    }
  });
});

describe('strapiID', () => {
  it('accepts a string', () => {
    expect(strapiID.safeParse('abc').success).toBe(true);
    expect(strapiID.safeParse('123').success).toBe(true);
    expect(strapiID.safeParse('').success).toBe(true);
  });

  it('accepts a non-negative integer', () => {
    expect(strapiID.safeParse(0).success).toBe(true);
    expect(strapiID.safeParse(1).success).toBe(true);
    expect(strapiID.safeParse(999).success).toBe(true);
  });

  it('rejects negative numbers', () => {
    expect(strapiID.safeParse(-1).success).toBe(false);
  });

  it('rejects floats', () => {
    expect(strapiID.safeParse(1.5).success).toBe(false);
  });

  it('rejects non-string non-number types', () => {
    expect(strapiID.safeParse(null).success).toBe(false);
    expect(strapiID.safeParse(undefined).success).toBe(false);
    expect(strapiID.safeParse(true).success).toBe(false);
    expect(strapiID.safeParse({}).success).toBe(false);
  });
});

describe('validateZodAsync', () => {
  const schema = z.object({
    name: z.string(),
    age: z.number(),
  });

  it('returns validated data on success', async () => {
    const validate = validateZodAsync(schema);
    const result = await validate({ name: 'John', age: 30 });
    expect(result).toEqual({ name: 'John', age: 30 });
  });

  it('throws ValidationError on invalid data', async () => {
    const validate = validateZodAsync(schema);
    await expect(validate({ name: 123 })).rejects.toThrow(errors.ValidationError);
  });

  it('throws ValidationError with formatted errors in details', async () => {
    const validate = validateZodAsync(schema);
    try {
      await validate({ name: 123 });
      throw new Error('should have thrown');
    } catch (e: any) {
      expect(e.name).toBe('ValidationError');
      expect(e.details.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['name'],
            message: expect.any(String),
            name: 'ValidationError',
          }),
        ])
      );
    }
  });

  it('uses custom error message when provided', async () => {
    const validate = validateZodAsync(schema);
    try {
      await validate({ name: 123 }, 'Custom validation failed');
      throw new Error('should have thrown');
    } catch (e: any) {
      expect(e.message).toBe('Custom validation failed');
    }
  });

  it('re-throws non-ZodError exceptions', async () => {
    const badSchema = z.string().transform(() => {
      throw new Error('unexpected');
    });
    const validate = validateZodAsync(badSchema);
    await expect(validate('test')).rejects.toThrow('unexpected');
  });
});
