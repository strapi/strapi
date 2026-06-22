import { recommendedPlugins } from '../plugins';

describe('recommendedPlugins', () => {
  it('returns the familiar first-party set keyed by canonical name', () => {
    expect(Object.keys(recommendedPlugins()).sort()).toEqual([
      'content-manager',
      'content-releases',
      'content-type-builder',
      'email',
      'i18n',
      'review-workflows',
      'upload',
    ]);
  });

  it('carries a `resolve` hint (npm package base) for the admin build', () => {
    const plugins = recommendedPlugins();

    // Each entry is `{ plugin, resolve }` so `buildAdmin` can import the
    // `<resolve>/strapi-admin` frontend without scanning package.json.
    for (const [name, entry] of Object.entries(plugins)) {
      expect(entry).toMatchObject({ resolve: `@strapi/${name}` });
      expect(typeof (entry as { plugin: unknown }).plugin).toBe('function');
    }
  });
});
