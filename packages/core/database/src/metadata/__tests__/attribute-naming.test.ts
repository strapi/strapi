import { createMetadata, attributeNaming } from '..';

import type { Model } from '../../types';

/**
 * The Content-Type Builder predicts the physical names of the *new* side of a
 * rename through `attributeNaming` before the server reloads. These tests pin
 * that prediction to what the metadata loader actually produces for the same
 * attribute, so a change to the naming rules cannot silently make a generated
 * rename migration target the wrong identifier (which the guards would then
 * turn into a no-op and data loss).
 */
describe('attributeNaming matches loaded metadata', () => {
  const longName = 'aVeryLongAttributeNameThatWillDefinitelyExceedTheIdentifierLengthLimit';

  const models: Model[] = [
    {
      uid: 'api::article.article',
      singularName: 'article',
      tableName: 'articles',
      attributes: {
        id: { type: 'increments' },
        title: { type: 'string' },
        [longName]: { type: 'string' },
        // owning bidirectional many-to-one: join table (the Strapi 5 default)
        category: {
          type: 'relation',
          relation: 'manyToOne',
          target: 'api::category.category',
          inversedBy: 'articles',
        },
        // owning many-to-many: join table
        tags: {
          type: 'relation',
          relation: 'manyToMany',
          target: 'api::tag.tag',
          inversedBy: 'articles',
        },
        [`${longName}Rel`]: {
          type: 'relation',
          relation: 'manyToMany',
          target: 'api::tag.tag',
        },
        // one-way x-to-one with useJoinTable: false
        author: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'api::category.category',
          useJoinTable: false,
        },
      },
    } as unknown as Model,
    {
      uid: 'api::category.category',
      singularName: 'category',
      tableName: 'categories',
      attributes: {
        id: { type: 'increments' },
        articles: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::article.article',
          mappedBy: 'category',
        },
      },
    } as unknown as Model,
    {
      uid: 'api::tag.tag',
      singularName: 'tag',
      tableName: 'tags',
      attributes: {
        id: { type: 'increments' },
        articles: {
          type: 'relation',
          relation: 'manyToMany',
          target: 'api::article.article',
          mappedBy: 'tags',
        },
      },
    } as unknown as Model,
  ];

  const metadata = createMetadata(models);
  const article = metadata.get('api::article.article');
  const attributes = article.attributes as Record<string, any>;

  it('derives scalar column names identically', () => {
    expect(attributes.title.columnName).toBe(attributeNaming.columnName('title'));
    expect(attributes[longName].columnName).toBe(attributeNaming.columnName(longName));
    // sanity: the long name really is shortened, so the hash path is covered
    expect(attributes[longName].columnName).not.toBe(longName);
  });

  it('derives join column names identically', () => {
    expect(attributes.author.joinColumn.name).toBe(attributeNaming.joinColumnName('author'));
  });

  it('derives join table names identically', () => {
    expect(attributes.tags.joinTable.name).toBe(
      attributeNaming.joinTableName(article.tableName, 'tags')
    );
    expect(attributes.category.joinTable.name).toBe(
      attributeNaming.joinTableName(article.tableName, 'category')
    );
    expect(attributes[`${longName}Rel`].joinTable.name).toBe(
      attributeNaming.joinTableName(article.tableName, `${longName}Rel`)
    );
  });

  it('is exposed on the metadata instance', () => {
    expect(metadata.naming).toBe(attributeNaming);
  });
});
