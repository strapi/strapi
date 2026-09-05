import { createMetadata } from '../../metadata';
import { metadataToSchema } from '../schema';

describe('metadataToSchema defaults', () => {
  it('maps attribute.default to column.defaultTo for new columns', () => {
    const metadata = createMetadata([
      {
        uid: 'api::article.article',
        singularName: 'article',
        tableName: 'articles',
        attributes: {
          id: { type: 'increments' },
          isUpdated: {
            type: 'boolean',
            default: false,
          },
        },
      },
    ]);

    const schema = metadataToSchema(metadata);
    const articleTable = schema.tables.find((table) => table.name === 'articles');

    expect(articleTable).toBeDefined();

    const isUpdatedColumn = articleTable?.columns.find((column) => column.name === 'is_updated');

    expect(isUpdatedColumn?.defaultTo).toBe(false);
  });
});
