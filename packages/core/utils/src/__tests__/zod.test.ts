import * as z from 'zod';

import { validateZodSchema, z as utilsZ } from '../zod';

describe('Zod export', () => {
  test('uses the same Zod instance as direct zod imports', () => {
    const schema = utilsZ.object({ name: utilsZ.string() });

    expect(schema).toBeInstanceOf(z.ZodObject);
    expect(utilsZ.ZodError).toBe(z.ZodError);
    expect(validateZodSchema(schema)({ name: 'Article' })).toEqual({ name: 'Article' });
  });
});
