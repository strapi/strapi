import { z, formatYupErrors } from '@strapi/utils';
import * as yup from 'yup';
import { formatZodErrors } from '../zod';

describe('Zod/Yup error format compatibility', () => {
  it('single required field produces same error shape', async () => {
    // Yup
    const yupSchema = yup.object({ name: yup.string().required('name is required') });
    let yupFormatted: any;
    try {
      await yupSchema.validate({});
    } catch (e: any) {
      yupFormatted = formatYupErrors(e);
    }

    // Zod
    const zodSchema = z.object({ name: z.string() });
    const zodResult = zodSchema.safeParse({});
    expect(zodResult.success).toBe(false);
    if (!zodResult.success) {
      const zodFormatted = formatZodErrors(zodResult.error);

      // Same structure
      expect(zodFormatted.errors).toHaveLength(yupFormatted.errors.length);
      expect(zodFormatted.errors[0].path).toEqual(yupFormatted.errors[0].path);
      expect(zodFormatted.errors[0].name).toEqual(yupFormatted.errors[0].name);
      expect(typeof zodFormatted.errors[0].message).toBe('string');
    }
  });

  it('multiple field errors produce same number of errors', async () => {
    // Yup
    const yupSchema = yup.object({
      name: yup.string().required('name is required'),
      age: yup.number().required('age is required'),
    });
    let yupFormatted: any;
    try {
      await yupSchema.validate({}, { abortEarly: false });
    } catch (e: any) {
      yupFormatted = formatYupErrors(e);
    }

    // Zod
    const zodSchema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const zodResult = zodSchema.safeParse({});
    expect(zodResult.success).toBe(false);
    if (!zodResult.success) {
      const zodFormatted = formatZodErrors(zodResult.error);
      expect(zodFormatted.errors.length).toBe(yupFormatted.errors.length);
    }
  });

  it('error objects have identical keys', async () => {
    const yupSchema = yup.object({ name: yup.string().required() });
    let yupError: any;
    try {
      await yupSchema.validate({});
    } catch (e: any) {
      yupError = formatYupErrors(e).errors[0];
    }

    const zodSchema = z.object({ name: z.string() });
    const zodResult = zodSchema.safeParse({});
    expect(zodResult.success).toBe(false);
    if (!zodResult.success) {
      const zodError = formatZodErrors(zodResult.error).errors[0];
      // Both have identical keys: message, name, path, value
      expect(Object.keys(zodError).sort()).toEqual(Object.keys(yupError).sort());
    }
  });
});
