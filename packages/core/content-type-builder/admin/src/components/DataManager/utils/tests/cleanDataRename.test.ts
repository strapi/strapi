import { stateToRequestData } from '../cleanData';

import type { ContentTypes, RenameHop } from '../../../../types';

const buildContentTypes = (
  attributes: any[],
  renames?: RenameHop[],
  status: any = 'CHANGED'
): ContentTypes => ({
  'api::article.article': {
    uid: 'api::article.article',
    globalId: 'article',
    modelName: 'article',
    kind: 'collectionType',
    modelType: 'contentType',
    restrictRelationsTo: null,
    status,
    visible: true,
    info: { displayName: 'article', singularName: 'article', pluralName: 'articles' },
    attributes,
    ...(renames ? { renames } : {}),
  } as any,
});

const firstContentType = (requestData: ReturnType<typeof stateToRequestData>['requestData']) => {
  const [contentType] = requestData.contentTypes as Array<{ attributes: any[]; renames?: any[] }>;
  return contentType;
};

describe('CleanData | rename serialization', () => {
  it('forwards the ordered renames array on an updated content type', () => {
    const { requestData } = stateToRequestData({
      components: {},
      contentTypes: buildContentTypes(
        [{ name: 'heading', type: 'string', status: 'CHANGED' }],
        [{ oldName: 'title', newName: 'heading' }]
      ),
    });

    const contentType = firstContentType(requestData);
    expect(contentType).toMatchObject({
      action: 'update',
      renames: [{ oldName: 'title', newName: 'heading' }],
    });
    // renames must not leak onto attributes or their properties.
    expect(contentType.attributes[0]).not.toHaveProperty('renames');
    expect(contentType.attributes[0].properties).not.toHaveProperty('renames');
  });

  it('forwards a multi-hop swap path verbatim and in order', () => {
    const { requestData } = stateToRequestData({
      components: {},
      contentTypes: buildContentTypes(
        [
          { name: 'b', type: 'string', status: 'CHANGED' },
          { name: 'a', type: 'string', status: 'CHANGED' },
        ],
        [
          { oldName: 'a', newName: 'tmp' },
          { oldName: 'b', newName: 'a' },
          { oldName: 'tmp', newName: 'b' },
        ]
      ),
    });

    expect(firstContentType(requestData).renames).toEqual([
      { oldName: 'a', newName: 'tmp' },
      { oldName: 'b', newName: 'a' },
      { oldName: 'tmp', newName: 'b' },
    ]);
  });

  it('omits renames when there are none', () => {
    const { requestData } = stateToRequestData({
      components: {},
      contentTypes: buildContentTypes([{ name: 'title', type: 'string', status: 'CHANGED' }]),
    });

    expect(firstContentType(requestData)).not.toHaveProperty('renames');
  });

  it('does not forward renames for NEW (create) content types', () => {
    const { requestData } = stateToRequestData({
      components: {},
      contentTypes: buildContentTypes(
        [{ name: 'heading', type: 'string', status: 'NEW' }],
        [{ oldName: 'title', newName: 'heading' }],
        'NEW'
      ),
    });

    const contentType = firstContentType(requestData);
    expect((contentType as any).action).toBe('create');
    expect(contentType).not.toHaveProperty('renames');
  });
});
