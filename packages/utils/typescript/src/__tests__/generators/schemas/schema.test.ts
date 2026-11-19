import { generateSchemaDefinition } from '../../../generators/common/models/schema';
import { emitDefinitions } from '../../../generators/utils';

const schema = {
  uid: 'api::article.article',
  modelType: 'contentType',
  kind: 'collectionType',
  info: { singularName: 'article', pluralName: 'articles', displayName: 'Article' },
  attributes: {
    subtitle: { type: 'string', conditions: { visible: { '==': [{ var: 'title' }, 'x'] } } },
    title: { type: 'string' },
  },
};

describe('generateSchemaDefinition', () => {
  test('names the interface after the uid and omits strict-only modifiers by default', () => {
    const output = emitDefinitions([generateSchemaDefinition(schema)]);

    expect(output).toContain(
      'export interface ApiArticleArticle extends Struct.CollectionTypeSchema'
    );
    expect(output).not.toContain('Conditional');
  });

  test('uses the given interface name and attribute options', () => {
    const output = emitDefinitions([
      generateSchemaDefinition(schema, 'ApiArticleArticle1', { strict: true }),
    ]);

    expect(output).toContain(
      'export interface ApiArticleArticle1 extends Struct.CollectionTypeSchema'
    );
    expect(output).toMatch(/subtitle: Schema\.Attribute\.String & Schema\.Attribute\.Conditional/);
  });
});
