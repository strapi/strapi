import { generateStrictDefinitions } from '../../../generators/strict';

describe('generateStrictDefinitions', () => {
  test('emits the type-only opt-in to strict server contracts through @strapi/strapi', async () => {
    const { output } = await generateStrictDefinitions();

    expect(output).toContain("import type {} from '@strapi/strapi/strict-types';");
    // must not reach into @strapi/types or a plugin directly: the app does not depend on them
    expect(output).not.toContain('@strapi/types');
    expect(output).not.toContain('strapi-server');
  });
});
