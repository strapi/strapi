import * as z from 'zod/v4';

import { zodToOpenAPI } from '../src/utils/zod';

describe('zodToOpenAPI', () => {
  it('does not embed $id from zod toJSONSchema (stable OpenAPI output)', () => {
    const schema = zodToOpenAPI(z.object({ name: z.string() }));

    expect(schema).not.toHaveProperty('$id');
    expect(schema).toMatchObject({
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    });
  });
});
