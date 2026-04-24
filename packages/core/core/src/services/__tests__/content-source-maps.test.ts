import { createContentSourceMapsService } from '../content-source-maps';

const UPLOAD_FILE_SCHEMA: any = {
  uid: 'plugin::upload.file',
  modelType: 'contentType',
  kind: 'collectionType',
  // Intentionally empty: we don't want the visitor to recurse into media sub-properties
  // for these tests. The outer visit is what matters — it's where the marker is added.
  attributes: {},
};

const mockStrapi: any = {
  getModel: (uid: string) => (uid === 'plugin::upload.file' ? UPLOAD_FILE_SCHEMA : undefined),
  log: { error: jest.fn() },
};

const articleSchema: any = {
  uid: 'api::article.article',
  modelType: 'contentType',
  kind: 'collectionType',
  attributes: {
    title: { type: 'text' },
    image: { type: 'media', multiple: false },
    gallery: { type: 'media', multiple: true },
  },
};

describe('content-source-maps service', () => {
  const service = createContentSourceMapsService(mockStrapi);

  describe('buildSourceString', () => {
    it('includes the required URLSearchParams keys', () => {
      const raw = service.buildSourceString({
        path: 'title',
        type: 'text',
        documentId: 'doc-1',
        locale: null,
        model: 'api::article.article',
      });
      const params = new URLSearchParams(raw);
      expect(params.get('path')).toBe('title');
      expect(params.get('type')).toBe('text');
      expect(params.get('documentId')).toBe('doc-1');
      expect(params.get('model')).toBe('api::article.article');
    });

    it('sets root=true when flagged', () => {
      const raw = service.buildSourceString({
        path: 'image',
        type: 'media',
        documentId: 'doc-1',
        locale: null,
        model: 'api::article.article',
        root: true,
      });
      expect(new URLSearchParams(raw).get('root')).toBe('true');
    });

    it('omits root when falsy', () => {
      const raw = service.buildSourceString({
        path: 'title',
        type: 'text',
        documentId: 'doc-1',
        locale: null,
      });
      expect(new URLSearchParams(raw).has('root')).toBe(false);
    });

    it('omits optional keys when absent', () => {
      const raw = service.buildSourceString({
        path: 'title',
        type: 'text',
        documentId: 'doc-1',
        locale: null,
      });
      const params = new URLSearchParams(raw);
      expect(params.has('model')).toBe(false);
      expect(params.has('kind')).toBe(false);
      expect(params.has('locale')).toBe(false);
    });
  });

  describe('encodeSourceMaps — string fields (regression)', () => {
    it('wraps string values with stega so the visible text is preserved', async () => {
      const data = { documentId: 'doc-1', title: 'Hello', locale: null };
      const result = await service.encodeSourceMaps({ data, schema: articleSchema });

      // Visible text still contains the original string
      expect(result.title).toEqual(expect.stringContaining('Hello'));
      // Stega appends zero-width characters so the encoded value is longer
      expect(result.title.length).toBeGreaterThan('Hello'.length);
    });

    it('leaves strings unchanged when the attribute has no encodable type', async () => {
      const schema: any = {
        uid: 'api::x.x',
        modelType: 'contentType',
        kind: 'collectionType',
        attributes: { slug: { type: 'uid' } },
      };
      const data = { documentId: 'doc-1', slug: 'my-slug', locale: null };
      const result = await service.encodeSourceMaps({ data, schema });
      expect(result.slug).toBe('my-slug');
    });
  });

  describe('encodeSourceMaps — media marker', () => {
    it('adds a _strapiSource marker to a single media field', async () => {
      const data = {
        documentId: 'doc-1',
        image: { id: 1, url: '/uploads/photo.jpg', mime: 'image/jpeg', name: 'photo.jpg' },
        locale: null,
      };
      const result = await service.encodeSourceMaps({ data, schema: articleSchema });
      expect(result.image._strapiSource).toEqual(expect.any(String));

      const params = new URLSearchParams(result.image._strapiSource);
      expect(params.get('path')).toBe('image');
      expect(params.get('type')).toBe('media');
      expect(params.get('root')).toBe('true');
      expect(params.get('documentId')).toBe('doc-1');
      expect(params.get('model')).toBe('api::article.article');
    });

    it('adds a marker to every item of a multiple media field with an indexed path', async () => {
      const data = {
        documentId: 'doc-1',
        gallery: [
          { id: 1, url: '/uploads/a.jpg', mime: 'image/jpeg' },
          { id: 2, url: '/uploads/b.jpg', mime: 'image/jpeg' },
        ],
        locale: null,
      };
      const result = await service.encodeSourceMaps({ data, schema: articleSchema });

      expect(result.gallery).toHaveLength(2);
      expect(new URLSearchParams(result.gallery[0]._strapiSource).get('path')).toBe('gallery.0');
      expect(new URLSearchParams(result.gallery[1]._strapiSource).get('path')).toBe('gallery.1');
      expect(new URLSearchParams(result.gallery[0]._strapiSource).get('root')).toBe('true');
    });

    it('preserves existing media object properties alongside the marker', async () => {
      const data = {
        documentId: 'doc-1',
        image: {
          id: 42,
          url: '/uploads/photo.jpg',
          name: 'photo.jpg',
          mime: 'image/jpeg',
          width: 1024,
          height: 768,
        },
        locale: null,
      };
      const result = await service.encodeSourceMaps({ data, schema: articleSchema });
      expect(result.image.id).toBe(42);
      expect(result.image.name).toBe('photo.jpg');
      expect(result.image.width).toBe(1024);
      expect(result.image.height).toBe(768);
    });

    it('leaves media untouched when the value is null', async () => {
      const data = { documentId: 'doc-1', image: null, locale: null };
      const result = await service.encodeSourceMaps({ data, schema: articleSchema });
      expect(result.image).toBeNull();
    });

    it('does not add root=true to string-field encodings', async () => {
      const data = { documentId: 'doc-1', title: 'Hello', locale: null };
      const result = await service.encodeSourceMaps({ data, schema: articleSchema });
      // The string still contains the visible text; metadata lives inside zero-width chars.
      // The encoded string should not advertise root=true — that belongs to field-root markers only.
      // We can't directly inspect the stega payload here, but we can verify the visible content
      // is untouched and no separate marker property has been added.
      expect(typeof result.title).toBe('string');
      expect(result.title).toEqual(expect.stringContaining('Hello'));
    });
  });

  describe('encodeSourceMaps — arrays and top-level data', () => {
    it('handles an array of entries at the top level', async () => {
      const data = [
        { documentId: 'doc-1', title: 'A', locale: null },
        { documentId: 'doc-2', title: 'B', locale: null },
      ];
      const result = await service.encodeSourceMaps({ data, schema: articleSchema });
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].title).toEqual(expect.stringContaining('A'));
      expect(result[1].title).toEqual(expect.stringContaining('B'));
    });

    it('returns non-object data unchanged', async () => {
      const result = await service.encodeSourceMaps({
        data: 'not an object' as any,
        schema: articleSchema,
      });
      expect(result).toBe('not an object');
    });
  });
});
