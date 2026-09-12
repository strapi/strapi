import { SPACE_ATTRIBUTE, SPACE_UID } from '../../../shared/constants';
import register from '../register';

const makeStrapi = (contentTypes: Record<string, any>, models: any[] = []) =>
  ({
    contentTypes,
    get: (name: string) => (name === 'models' ? { get: () => models } : undefined),
    db: {
      metadata: {
        identifiers: {
          getIndexName: (parts: string[]) => `${parts.join('_')}_idx`,
        },
      },
    },
  }) as never;

const contentType = (uid: string, extra: Record<string, unknown> = {}) =>
  ({
    uid,
    modelType: 'contentType',
    collectionName: uid.split('.').pop(),
    attributes: { title: { type: 'string' }, documentId: { type: 'string' } } as Record<
      string,
      unknown
    >,
    ...extra,
  }) as any;

describe('register', () => {
  describe('the space column', () => {
    it('is added to a project’s own content types', () => {
      const article = contentType('api::article.article');
      register({ strapi: makeStrapi({ 'api::article.article': article }) });

      expect(article.attributes[SPACE_ATTRIBUTE]).toMatchObject({
        type: 'relation',
        relation: 'manyToOne',
        target: SPACE_UID,
        // A real column rather than a link table, so the filter is an indexed
        // comparison rather than a join.
        useJoinTable: false,
        // Callers name their space in a header; they never read or write it.
        private: true,
      });
    });

    it('is not added to the platform’s own records', () => {
      const user = contentType('admin::user');
      register({ strapi: makeStrapi({ 'admin::user': user }) });

      expect(user.attributes[SPACE_ATTRIBUTE]).toBeUndefined();
    });

    it('is a fresh descriptor per content type', () => {
      // Model registration mutates attribute metadata in place, so one shared
      // descriptor would end up with the join metadata of whichever content
      // type was registered last.
      const article = contentType('api::article.article');
      const page = contentType('api::page.page');

      register({
        strapi: makeStrapi({ 'api::article.article': article, 'api::page.page': page }),
      });

      expect(article.attributes[SPACE_ATTRIBUTE]).not.toBe(page.attributes[SPACE_ATTRIBUTE]);
    });

    it('indexes the space alongside the document', () => {
      const article = contentType('api::article.article');
      register({ strapi: makeStrapi({ 'api::article.article': article }) });

      expect((article as any).indexes).toContainEqual({
        name: 'article_space_idx',
        columns: ['space_id', 'document_id'],
      });
    });
  });

  describe('unique constraints on a scoped model', () => {
    it('become unique per space', () => {
      // Media folders allocate their pathId from the highest one they can see,
      // so a project-wide constraint would refuse the second space's first
      // folder.
      const folder = contentType('plugin::upload.folder', {
        indexes: [
          { name: 'upload_folders_path_id_index', columns: ['path_id'], type: 'unique' },
          { name: 'upload_folders_path_index', columns: ['path'], type: 'unique' },
        ],
      });

      register({ strapi: makeStrapi({ 'plugin::upload.folder': folder }) });

      expect((folder as any).indexes).toEqual(
        expect.arrayContaining([
          {
            name: 'upload_folders_path_id_index',
            columns: ['space_id', 'path_id'],
            type: 'unique',
          },
          { name: 'upload_folders_path_index', columns: ['space_id', 'path'], type: 'unique' },
        ])
      );
    });

    it('leaves non-unique indexes alone', () => {
      const article = contentType('api::article.article', {
        indexes: [{ name: 'article_title_idx', columns: ['title'] }],
      });

      register({ strapi: makeStrapi({ 'api::article.article': article }) });

      expect((article as any).indexes).toContainEqual({
        name: 'article_title_idx',
        columns: ['title'],
      });
    });

    it('leaves an unscoped model’s constraints project-wide', () => {
      const role = contentType('admin::role', {
        indexes: [{ name: 'admin_roles_code_index', columns: ['code'], type: 'unique' }],
      });

      register({ strapi: makeStrapi({ 'admin::role': role }) });

      expect((role as any).indexes).toContainEqual({
        name: 'admin_roles_code_index',
        columns: ['code'],
        type: 'unique',
      });
    });
  });

  describe('models registered outside the content types', () => {
    it('gives content history versions a space', () => {
      // A version carries a copy of the entry it was taken from, so it would
      // otherwise be readable from any space.
      const version = {
        uid: 'plugin::content-manager.history-version',
        attributes: {} as Record<string, unknown>,
      };

      register({ strapi: makeStrapi({}, [version]) });

      expect(version.attributes[SPACE_ATTRIBUTE]).toBeDefined();
    });

    it('leaves other internal models alone', () => {
      const job = {
        uid: 'plugin::upload.ai-metadata-job',
        attributes: {} as Record<string, unknown>,
      };

      register({ strapi: makeStrapi({}, [job]) });

      expect(job.attributes[SPACE_ATTRIBUTE]).toBeUndefined();
    });
  });
});
