import { createYupSchema } from '../validation';

const gallery = {
  gallery: { type: 'media' as const, multiple: true, required: true },
};

describe('createYupSchema required multiple media', () => {
  test('rejects an empty array on publish', async () => {
    const schema = createYupSchema(gallery, {}, { status: 'published' });

    await expect(schema.validate({ gallery: [] })).rejects.toThrow();
  });

  test('rejects null and a missing value on publish', async () => {
    const schema = createYupSchema(gallery, {}, { status: 'published' });

    await expect(schema.validate({ gallery: null })).rejects.toThrow();
    await expect(schema.validate({})).rejects.toThrow();
  });

  test('accepts a selected file on publish', async () => {
    const schema = createYupSchema(gallery, {}, { status: 'published' });

    await expect(schema.validate({ gallery: [{ id: 1 }] })).resolves.toEqual({
      gallery: [{ id: 1 }],
    });
  });

  test('accepts an empty array on a draft', async () => {
    const schema = createYupSchema(gallery, {}, { status: 'draft' });

    await expect(schema.validate({ gallery: [] })).resolves.toEqual({ gallery: [] });
  });

  test('accepts an empty array when the field is not required', async () => {
    const schema = createYupSchema(
      { gallery: { type: 'media', multiple: true, required: false } },
      {},
      { status: 'published' }
    );

    await expect(schema.validate({ gallery: [] })).resolves.toEqual({ gallery: [] });
  });

  test('still accepts a file on required single media', async () => {
    const schema = createYupSchema(
      { cover: { type: 'media', multiple: false, required: true } },
      {},
      { status: 'published' }
    );

    await expect(schema.validate({ cover: { id: 1 } })).resolves.toEqual({ cover: { id: 1 } });
    await expect(schema.validate({ cover: null })).rejects.toThrow();
  });
});
