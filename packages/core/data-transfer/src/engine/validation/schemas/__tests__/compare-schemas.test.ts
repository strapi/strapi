import { compareSchemas } from '..';

const articleSchema = (attributes: Record<string, unknown>) => ({
  uid: 'api::article.article',
  kind: 'collectionType',
  attributes,
});

const title = { type: 'string' };
const position = { type: 'integer', private: true, visible: false, configurable: false };

describe('Data transfer | compare schemas', () => {
  test('strict reports an attribute missing on one side', () => {
    const diffs = compareSchemas(
      articleSchema({ title, body: { type: 'text' } }),
      articleSchema({ title }),
      'strict'
    );

    expect(diffs).toEqual([
      expect.objectContaining({ kind: 'deleted', path: ['attributes', 'body'] }),
    ]);
  });

  test('strict ignores the position of the custom order, present only while its flag is on', () => {
    const withPosition = articleSchema({ title, strapi_position: position });
    const withoutPosition = articleSchema({ title });

    expect(compareSchemas(withPosition, withoutPosition, 'strict')).toEqual([]);
    expect(compareSchemas(withoutPosition, withPosition, 'strict')).toEqual([]);
    expect(compareSchemas(withPosition, withoutPosition, 'exact')).toHaveLength(1);
  });
});
