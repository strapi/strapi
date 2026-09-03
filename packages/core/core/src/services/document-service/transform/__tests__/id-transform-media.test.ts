import type { Core, Internal, Schema } from '@strapi/types';

import { transformParamsDocumentId } from '../id-transform';

const ARTICLE_UID = 'api::article.article' as Internal.UID.ContentType;
const MEDIA_COMPONENT_UID = 'shared.media' as Internal.UID.Component;
const UPLOAD_UID = 'plugin::upload.file' as Internal.UID.ContentType;

const models = {
  [ARTICLE_UID]: {
    uid: ARTICLE_UID,
    modelType: 'contentType',
    kind: 'collectionType',
    modelName: 'article',
    globalId: 'Article',
    info: {
      displayName: 'Article',
      singularName: 'article',
      pluralName: 'articles',
    },
    options: {
      draftAndPublish: true,
    },
    attributes: {
      cover: {
        type: 'media',
        multiple: false,
      },
      gallery: {
        type: 'media',
        multiple: true,
      },
      mediaComponent: {
        type: 'component',
        component: MEDIA_COMPONENT_UID,
        repeatable: false,
      },
      blocks: {
        type: 'dynamiczone',
        components: [MEDIA_COMPONENT_UID],
      },
    },
  },
  [MEDIA_COMPONENT_UID]: {
    uid: MEDIA_COMPONENT_UID,
    modelType: 'component',
    modelName: 'media',
    globalId: 'ComponentSharedMedia',
    category: 'shared',
    info: {
      displayName: 'Media',
    },
    attributes: {
      cover: {
        type: 'media',
        multiple: false,
      },
      gallery: {
        type: 'media',
        multiple: true,
      },
    },
  },
  [UPLOAD_UID]: {
    uid: UPLOAD_UID,
    modelType: 'contentType',
    kind: 'collectionType',
    modelName: 'file',
    globalId: 'UploadFile',
    info: {
      displayName: 'File',
      singularName: 'file',
      pluralName: 'files',
    },
    options: {
      draftAndPublish: false,
    },
    attributes: {
      documentId: {
        type: 'string',
      },
    },
  },
} as unknown as Record<string, Schema.ContentType | Schema.Component>;

const findMedia = jest.fn();

describe('Transform media data', () => {
  beforeAll(() => {
    global.strapi = {
      getModel: (uid: string) => models[uid],
      plugins: {
        i18n: {
          services: {
            'content-types': {
              isLocalizedContentType() {
                return false;
              },
            },
            locales: {
              getDefaultLocale() {
                return 'en';
              },
            },
          },
        },
      },
      db: {
        query: jest.fn(() => ({ findMany: findMedia })),
      },
    } as unknown as Core.Strapi;
  });

  beforeEach(() => {
    findMedia.mockReset();
    findMedia.mockResolvedValue([
      { id: 1, documentId: 'cover-doc' },
      { id: 2, documentId: 'gallery-doc' },
      { id: 3, documentId: 'component-cover-doc' },
      { id: 4, documentId: 'component-gallery-doc' },
      { id: 5, documentId: 'dz-cover-doc' },
      { id: 6, documentId: 'dz-gallery-doc' },
    ]);
  });

  it('maps media documentIds in direct, component, and dynamic-zone single/multiple inputs', async () => {
    const { data } = await transformParamsDocumentId(ARTICLE_UID, {
      data: {
        cover: 'cover-doc',
        gallery: [{ documentId: 'gallery-doc' }, 20],
        mediaComponent: {
          cover: { documentId: 'component-cover-doc' },
          gallery: ['component-gallery-doc', { id: 21 }],
        },
        blocks: [
          {
            __component: MEDIA_COMPONENT_UID,
            cover: 'dz-cover-doc',
            gallery: [{ documentId: 'dz-gallery-doc' }, 22],
          },
        ],
      },
      status: 'draft',
    });

    expect(data).toEqual({
      cover: { set: [{ id: 1 }] },
      gallery: { set: [{ id: 2 }, { id: 20 }] },
      mediaComponent: {
        cover: { set: [{ id: 3 }] },
        gallery: { set: [{ id: 4 }, { id: 21 }] },
      },
      blocks: [
        {
          __component: MEDIA_COMPONENT_UID,
          cover: { set: [{ id: 5 }] },
          gallery: { set: [{ id: 6 }, { id: 22 }] },
        },
      ],
    });
    expect(findMedia).toHaveBeenCalledTimes(1);
    expect(findMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          documentId: {
            $in: [
              'cover-doc',
              'gallery-doc',
              'component-cover-doc',
              'component-gallery-doc',
              'dz-cover-doc',
              'dz-gallery-doc',
            ],
          },
        },
      })
    );
  });
});
