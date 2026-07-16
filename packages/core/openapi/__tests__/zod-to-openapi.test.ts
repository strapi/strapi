import type { Core } from '@strapi/types';
import * as z from 'zod/v4';

import { DocumentContextFactory } from '../src/context';
import { ComponentsWriter } from '../src/post-processor/component-writer';
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

describe('ComponentsWriter', () => {
  it('strips $id from component schemas written from the global registry', () => {
    const registered = z.object({ title: z.string() });
    z.globalRegistry.add(registered, { id: 'CoverageProbeDocument' });

    try {
      const context = new DocumentContextFactory().create({
        strapi: {
          config: { get: () => undefined },
        } as unknown as Core.Strapi,
        routes: [],
      });

      new ComponentsWriter().postProcess(context);

      const schema = context.output.data.components?.schemas?.CoverageProbeDocument;
      expect(schema).toBeDefined();
      expect(schema).not.toHaveProperty('$id');
      expect(schema).toMatchObject({
        type: 'object',
        properties: {
          title: { type: 'string' },
        },
      });
    } finally {
      z.globalRegistry.remove(registered);
    }
  });
});
