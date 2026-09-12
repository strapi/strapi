import { SPACE_ATTRIBUTE, SPACE_UID } from '../../../../shared/constants';
import createContentTypesService, { isScopedContentType } from '../content-types';

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

describe('the models Spaces actually scopes', () => {
  const contentTypes = (uids: Record<string, string | undefined>) =>
    Object.fromEntries(
      Object.entries(uids).map(([uid, target]) => [
        uid,
        { uid, attributes: target ? { [SPACE_ATTRIBUTE]: { target } } : {} },
      ])
    );

  const makeService = (uids: Record<string, string | undefined>) =>
    createContentTypesService({ strapi: { contentTypes: contentTypes(uids) } as never });

  describe('the list', () => {
    it('is the models carrying a space attribute', () => {
      const service = makeService({
        'api::article.article': SPACE_UID,
        'admin::user': undefined,
      });

      expect(service.listScopedUids()).toEqual(['api::article.article']);
    });

    it('leaves out an attribute called `space` that points somewhere else', () => {
      // A project is free to have its own `space` relation.
      const service = makeService({
        'api::article.article': SPACE_UID,
        'api::booking.booking': 'api::venue.venue',
      });

      expect(service.listScopedUids()).toEqual(['api::article.article']);
    });
  });

  describe('what a space may use', () => {
    it('is everything, when the space restricts itself to nothing', () => {
      const service = makeService({
        'api::article.article': SPACE_UID,
        'api::page.page': SPACE_UID,
      });

      expect(service.listAvailableUids({ contentTypes: null })).toEqual([
        'api::article.article',
        'api::page.page',
      ]);
    });

    it('is what it names', () => {
      const service = makeService({
        'api::article.article': SPACE_UID,
        'api::page.page': SPACE_UID,
      });

      expect(service.listAvailableUids({ contentTypes: ['api::page.page'] })).toEqual([
        'api::page.page',
      ]);
    });

    it('is nothing when it names nothing at all', () => {
      // An empty list is a deliberate choice, unlike `null`.
      const service = makeService({ 'api::article.article': SPACE_UID });

      expect(service.listAvailableUids({ contentTypes: [] })).toEqual([]);
    });

    it('ignores a name that no longer matches a model', () => {
      const service = makeService({ 'api::article.article': SPACE_UID });

      expect(service.listAvailableUids({ contentTypes: ['api::gone.gone'] })).toEqual([]);
    });
  });

  describe('what an administrator can choose from', () => {
    it('is the project’s own content types', () => {
      // A plugin's data is not something a space opts out of.
      const service = makeService({
        'api::article.article': SPACE_UID,
        'plugin::todo.todo': SPACE_UID,
      });

      expect(service.listSelectableUids()).toEqual(['api::article.article']);
    });
  });
});
