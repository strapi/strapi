import { generatePluginsDefinitions } from '../../../generators/plugins';

describe('generatePluginsDefinitions', () => {
  test('emits the type-only opt-in to the bundled plugins entry of @strapi/strapi', async () => {
    const { output } = await generatePluginsDefinitions();

    expect(output).toContain("import type {} from '@strapi/strapi/plugins';");
    // must not reach into a plugin package directly: the app does not depend on them
    expect(output).not.toContain('@strapi/i18n');
  });
});
