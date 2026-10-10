import traverseEntity from '../traverse-entity';
import type { Model } from '../types';

const createContentType = (attributes: Model['attributes']): Model => ({
  modelType: 'contentType',
  uid: 'api::article.article',
  kind: 'collectionType',
  info: {
    displayName: 'Article',
    singularName: 'article',
    pluralName: 'articles',
  },
  attributes,
});

const createComponent = (uid: string, attributes: Model['attributes']): Model => ({
  modelType: 'component',
  uid,
  info: { displayName: uid },
  attributes,
});

describe('traverseEntity parent context', () => {
  test('keeps the dynamic-zone parent for sibling keys after traversing a nested component', async () => {
    const nestedComponent = createComponent('shared.media', {
      caption: { type: 'string' },
    });
    const quoteComponent = createComponent('shared.quote', {
      authorImage: {
        type: 'component',
        component: 'shared.media',
        repeatable: false,
      },
      title: { type: 'string' },
    });
    const blocksAttribute = {
      type: 'dynamiczone' as const,
      components: ['shared.quote'],
    };
    const article = createContentType({ blocks: blocksAttribute });

    const getModel = jest.fn((uid: string) => {
      if (uid === 'shared.quote') return quoteComponent;
      if (uid === 'shared.media') return nestedComponent;
      throw new Error(`Unexpected model ${uid}`);
    });
    const visitor = jest.fn();

    await traverseEntity(
      visitor,
      { schema: article, getModel },
      {
        blocks: [
          {
            // This ordering reproduces #27474: traversing this nested component used to
            // leak its parent into the following __component sibling.
            authorImage: { caption: 'Portrait' },
            __component: 'shared.quote',
            title: 'Quote',
          },
        ],
      }
    );

    const componentMarkerCall = visitor.mock.calls.find(
      ([options]) => options.key === '__component'
    );

    expect(componentMarkerCall?.[0].parent).toEqual({
      schema: article,
      key: 'blocks',
      attribute: blocksAttribute,
      path: {
        raw: 'blocks',
        attribute: 'blocks',
        rawWithIndices: 'blocks',
      },
    });
  });
});
