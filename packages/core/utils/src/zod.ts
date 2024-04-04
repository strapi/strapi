import { z } from 'zod';

import { ValidationError } from './errors';

export const validateZod =
  <T extends z.ZodTypeAny>(schema: T) =>
  (data: unknown): z.TypeOf<T> => {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const { message, errors } = formatZodErrors(error);
        throw new ValidationError(message, { errors });
      }

      throw error;
    }
  };

const formatZodErrors = (zodError: z.ZodError) => ({
  errors: zodError.errors.map((error) => {
    return {
      path: error.path,
      message: error.message,
      name: 'ValidationError',
    };
  }),
  message: 'Validation error',
});
