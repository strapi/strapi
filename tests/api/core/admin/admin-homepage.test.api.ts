'use strict';

import { createTestBuilder } from 'api-tests/builder';
import { createAuthRequest } from 'api-tests/request';
import { createStrapiInstance } from 'api-tests/strapi';

const articleUid = 'api::article.article';
const articleModel = {
  kind: 'collectionType',
  collectionName: 'articles',
  singularName: 'article',
  pluralName: 'articles',
  displayName: 'Article',
  description: '',
  draftAndPublish: true,
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  attributes: {
    title: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
    content: {
      type: 'blocks',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
  },
};

const authorUid = 'api::author.author';
const authorModel = {
  kind: 'collectionType',
  collectionName: 'authors',
  singularName: 'author',
  pluralName: 'authors',
  displayName: 'Author',
  description: '',
  draftAndPublish: false,
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  attributes: {
    name: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
  },
};

const tagUid = 'api::tag.tag';
const tagModel = {
  kind: 'collectionType',
  collectionName: 'tags',
  singularName: 'tag',
  pluralName: 'tags',
  displayName: 'Tag',
  description: '',
  draftAndPublish: true,
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  attributes: {
    slug: {
      type: 'string',
    },
  },
};

const globalUid = 'api::global.global';
const globalModel = {
  kind: 'singleType',
  collectionName: 'globals',
  singularName: 'global',
  pluralName: 'globals',
  displayName: 'Global',
  description: '',
  attributes: {
    siteName: {
      type: 'string',
    },
  },
};

describe('Homepage API', () => {
  const builder = createTestBuilder();
  let strapi;
  let rq;

  beforeAll(async () => {
    await builder.addContentTypes([articleModel, globalModel, tagModel, authorModel]).build();
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  it('requires action param', async () => {
    const response = await rq({
      method: 'GET',
      url: '/admin/homepage/recent-documents',
    });

    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchObject({
      error: {
        message: 'action is a required field',
      },
    });
  });

  it('finds the most recently updated documents', async () => {
    // Create a global document so we can update it later
    const globalDoc = await strapi.documents(globalUid).create({
      data: {
        siteName: 'a cool site name',
      },
    });

    /**
     * Create content in different content types. Use a loop with the modulo operator to alternate
     * actions of different kinds, so we can then make sure that the list of recent documents
     * has them all in the right order.
     **/
    for (let i = 0; i < 9; i++) {
      if (i % 3 === 0) {
        await strapi.documents(articleUid).create({
          data: {
            title: `Article ${i}`,
            content: [{ type: 'paragraph', children: [{ type: 'text', text: 'Hello world' }] }],
          },
        });
      } else if (i % 3 === 1) {
        await strapi.documents(globalUid).update({
          documentId: globalDoc.documentId,
          data: {
            siteName: `global-${i}`,
          },
        });
      } else {
        await strapi.documents(tagUid).create({
          data: {
            slug: `tag-${i}`,
          },
        });
      }
    }

    const response = await rq({
      method: 'GET',
      url: '/admin/homepage/recent-documents?action=update',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.data).toHaveLength(4);
    expect(response.body.data[0].title).toBe('tag-8');
    expect(response.body.data[0].model).toBe('api::tag.tag');
    expect(response.body.data[1].title).toBe('global-7');
    expect(response.body.data[1].model).toBe('api::global.global');
    expect(response.body.data[2].title).toBe('Article 6');
    expect(response.body.data[2].model).toBe('api::article.article');
    expect(response.body.data[3].title).toBe('tag-5');
    expect(response.body.data[3].model).toBe('api::tag.tag');
  });

  it('finds the most recently published documents', async () => {
    // Create draft and publish documents
    const article = await strapi.documents(articleUid).create({
      data: {
        title: 'The Paperback Writer',
      },
    });
    const tag = await strapi.documents(tagUid).create({
      data: {
        slug: 'Tag 1',
      },
    });
    // Create non raft and publish document
    const author = await strapi.documents(authorUid).create({
      data: {
        name: 'Paul McCartney',
      },
    });

    // Publish the article
    await strapi.documents(articleUid).publish({
      documentId: article.documentId,
    });
    // Update published document to create a 'modified' status
    await strapi.documents(articleUid).update({
      documentId: article.documentId,
      data: {
        title: 'Paperback Writer',
      },
    });
    await strapi.documents(tagUid).publish({
      documentId: tag.documentId,
    });
    // Update the author (won't be included in the response)
    await strapi.documents(authorUid).update({
      documentId: author.documentId,
      data: {
        name: `John Lennon`,
      },
    });

    const response = await rq({
      method: 'GET',
      url: '/admin/homepage/recent-documents?action=publish',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data.every((doc) => doc.hasDraftAndPublish)).toBe(true);
    expect(response.body.data[0].title).toBe('Tag 1');
    expect(response.body.data[0].status).toBe('published');
    // Assert the data is the published data, but the status should be modified
    expect(response.body.data[1].title).toBe('The Paperback Writer');
    expect(response.body.data[1].status).toBe('modified');
  });
});
