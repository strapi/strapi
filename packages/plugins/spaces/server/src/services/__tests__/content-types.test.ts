import { isScopedContentType } from '../content-types';

const schema = (uid: string, pluginOptions?: Record<string, unknown>) =>
  ({ uid, pluginOptions, attributes: {} }) as never;

describe('which content types belong to a space', () => {
  describe('by default', () => {
    it("scopes the project's own content types: they are what tenancy is about", () => {
      expect(isScopedContentType(schema('api::article.article'))).toBe(true);
    });

    it('leaves plugin-owned content types alone: they are usually configuration', () => {
      expect(isScopedContentType(schema('plugin::some-plugin.thing'))).toBe(false);
    });

    it('scopes the ones a space user reaches through the admin', () => {
      expect(isScopedContentType(schema('plugin::upload.file'))).toBe(true);
      expect(isScopedContentType(schema('plugin::upload.folder'))).toBe(true);
      expect(isScopedContentType(schema('plugin::content-releases.release'))).toBe(true);
    });
  });

  describe("never, whatever else says so — the platform's own records", () => {
    it.each([
      'admin::user',
      'admin::role',
      'admin::permission',
      'admin::api-token',
      'admin::transfer-token',
      'plugin::spaces.space',
      'plugin::spaces.space-membership',
      'plugin::i18n.locale',
      'plugin::users-permissions.role',
    ])('%s', (uid) => {
      expect(isScopedContentType(schema(uid))).toBe(false);
    });

    it('not even when a schema asks for it', () => {
      expect(isScopedContentType(schema('admin::user', { spaces: { scoped: true } }))).toBe(false);
    });
  });

  describe('explicit opt-out', () => {
    it('lets a content type be shared across every space', () => {
      expect(
        isScopedContentType(schema('api::country.country', { spaces: { scoped: false } }))
      ).toBe(false);
    });

    it('lets a plugin content type opt in', () => {
      expect(isScopedContentType(schema('plugin::todo.todo', { spaces: { scoped: true } }))).toBe(
        true
      );
    });

    it('ignores an unrelated plugin option', () => {
      expect(
        isScopedContentType(schema('api::article.article', { i18n: { localized: true } }))
      ).toBe(true);
    });
  });

  describe('malformed input', () => {
    it('does not scope something with no uid', () => {
      expect(isScopedContentType({ attributes: {} } as never)).toBe(false);
      expect(isScopedContentType(undefined)).toBe(false);
    });
  });
});
