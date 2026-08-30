import { z, getZodValidationErrors } from '@strapi/utils';

describe('getZodValidationErrors', () => {
  it('returns empty object for error with no issues', () => {
    const error = new z.ZodError([]);
    expect(getZodValidationErrors(error)).toEqual({});
  });

  it('converts a single field error to FormErrors shape', () => {
    const schema = z.object({
      name: z.string(),
    });

    const result = schema.safeParse({ name: 123 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const formErrors = getZodValidationErrors(result.error);
      expect(formErrors).toEqual({
        name: expect.any(String),
      });
    }
  });

  it('converts multiple field errors', () => {
    const schema = z.object({
      name: z.string(),
      email: z.string().email(),
    });

    const result = schema.safeParse({ name: 123, email: 'not-email' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const formErrors = getZodValidationErrors(result.error);
      expect(formErrors).toHaveProperty('name');
      expect(formErrors).toHaveProperty('email');
    }
  });

  it('converts nested path errors to dot-notation keys', () => {
    const schema = z.object({
      address: z.object({
        street: z.string(),
        city: z.string(),
      }),
    });

    const result = schema.safeParse({ address: { street: 42, city: 99 } });
    expect(result.success).toBe(false);
    if (!result.success) {
      const formErrors = getZodValidationErrors(result.error);
      expect(formErrors).toHaveProperty(['address.street']);
      expect(formErrors).toHaveProperty(['address.city']);
    }
  });

  it('converts array index paths to dot-notation', () => {
    const schema = z.object({
      items: z.array(z.string()),
    });

    const result = schema.safeParse({ items: ['ok', 42] });
    expect(result.success).toBe(false);
    if (!result.success) {
      const formErrors = getZodValidationErrors(result.error);
      expect(formErrors).toHaveProperty(['items.1']);
    }
  });

  it('keeps only the first error per path', () => {
    const schema = z.object({
      name: z.string().superRefine((val, ctx) => {
        ctx.addIssue({ code: 'custom', message: 'first error' });
        ctx.addIssue({ code: 'custom', message: 'second error' });
      }),
    });

    const result = schema.safeParse({ name: 'test' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const formErrors = getZodValidationErrors(result.error);
      expect(formErrors.name).toBe('first error');
    }
  });
});
