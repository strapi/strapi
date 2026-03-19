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
  draftAndPublish: true,
  attributes: {
    siteName: {
      type: 'string',
    },
  },
};

/**
 * Testing the Homepage API endpoints of the Content Manager.
 */
describe('Homepage API', () => {
  const builder = createTestBuilder();
  let strapi;
  let rq;

  describe('Recent Documents', () => {
    beforeAll(async () => {
      await builder
        .addContentTypes([articleModel, globalModel, tagModel, authorModel])
        .addFixtures('plugin::i18n.locale', [
          { name: 'French', code: 'fr' },
          { name: 'German', code: 'de' },
        ])
        .build();
      strapi = await createStrapiInstance();
      rq = await createAuthRequest({ strapi });
    });

    it('requires action param', async () => {
      const response = await rq({
        method: 'GET',
        url: '/content-manager/homepage/recent-documents',
      });

      expect(response.statusCode).toBe(400);
      expect(response.body).toMatchObject({
        error: {
          message: 'action is a required field',
        },
      });
    });

    /**
     * GET /content-manager/homepage/recent-documents?action=update
     * - Used to display the list of recently updated documents in a widget on the Homepage.
     */
    it('finds the most recently updated documents', async () => {
      // Create a global document so we can update it later
      const globalDoc = await strapi.documents(globalUid).create({
        data: {
          siteName: 'a cool site name',
        },
      });
      await strapi.documents(globalUid).publish({
        documentId: globalDoc.documentId,
      });

      /**
       * Create content in different content types. Use a loop with the modulo operator to alternate
       * actions of different kinds, so we can then make sure that the list of recent documents
       * has them all in the right order.
       **/
      for (let i = 0; i < 9; i++) {
        if (i % 3 === 0) {
          // When index is 0, 3, 6
          await strapi.documents(articleUid).create({
            data: {
              title: `Article ${i}`,
              content: [{ type: 'paragraph', children: [{ type: 'text', text: 'Hello world' }] }],
            },
          });
        } else if (i % 3 === 1) {
          // When index is 1, 4, 7
          await strapi.documents(globalUid).update({
            documentId: globalDoc.documentId,
            status: 'draft',
            data: {
              siteName: `global-${i}`,
            },
          });
        } else {
          // When index is 2, 5, 8
          await strapi.documents(authorUid).create({
            data: {
              name: `author-${i}`,
            },
          });
        }
      }

      const response = await rq({
        method: 'GET',
        url: '/content-manager/homepage/recent-documents?action=update',
      });

      // Assert the response
      expect(response.statusCode).toBe(200);
      expect(response.body.data).toHaveLength(4);
      // Assert the document titles
      expect(response.body.data[0].title).toBe('author-8');
      expect(response.body.data[1].title).toBe('global-7');
      expect(response.body.data[2].title).toBe('Article 6');
      expect(response.body.data[3].title).toBe('author-5');
      // Assert the document content type uids
      expect(response.body.data[0].contentTypeUid).toBe('api::author.author');
      expect(response.body.data[1].contentTypeUid).toBe('api::global.global');
      expect(response.body.data[2].contentTypeUid).toBe('api::article.article');
      expect(response.body.data[3].contentTypeUid).toBe('api::author.author');
      // Assert the document statuses
      expect(response.body.data[0].status).toBe(undefined);
      expect(response.body.data[1].status).toBe('modified');
      expect(response.body.data[2].status).toBe('draft');
      expect(response.body.data[3].status).toBe(undefined);
    });

    /**
     * GET /content-manager/homepage/recent-documents?action=publish
     * - Used to display the list of recently published documents in a widget on the Homepage.
     */
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
      // Create non draft and publish document
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
          name: 'John Lennon',
        },
      });

      const response = await rq({
        method: 'GET',
        url: '/content-manager/homepage/recent-documents?action=publish',
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.data.every((doc) => doc.publishedAt)).not.toBe(null);
      expect(response.body.data[0].title).toBe('Tag 1');
      expect(response.body.data[0].status).toBe('published');
      // Assert the data is the published data, but the status should be modified
      expect(response.body.data[1].title).toBe('The Paperback Writer');
      expect(response.body.data[1].status).toBe('modified');
    });

    /**
     * GET /content-manager/homepage/recent-documents?action=publish
     * - Used to display the list of recently published documents (no matter the locale) in a widget on the Homepage.
     */
    it('finds published documents from different locales', async () => {
      // Create and publish an article in English locale (default)
      const englishArticle = await strapi.documents(articleUid).create({
        data: {
          title: 'English Article Title',
        },
        locale: 'en',
      });
      await strapi.documents(articleUid).publish({
        documentId: englishArticle.documentId,
        locale: 'en',
      });

      // Create and publish an article in French locale
      const frenchArticle = await strapi.documents(articleUid).create({
        data: {
          title: 'Titre Article Français',
        },
        locale: 'fr',
      });
      await strapi.documents(articleUid).publish({
        documentId: frenchArticle.documentId,
        locale: 'fr',
      });

      // Create and publish an article in German locale
      const germanArticle = await strapi.documents(articleUid).create({
        data: {
          title: 'Deutscher Artikel Titel',
        },
        locale: 'de',
      });
      await strapi.documents(articleUid).publish({
        documentId: germanArticle.documentId,
        locale: 'de',
      });

      const response = await rq({
        method: 'GET',
        url: '/content-manager/homepage/recent-documents?action=publish',
      });

      expect(response.statusCode).toBe(200);
      // We expect the 3 new documents, but also one that was published in the previous test
      expect(response.body.data).toHaveLength(4);
      expect(response.body.data.every((doc) => doc.publishedAt)).not.toBe(null);

      // Verify we have entries from different locales
      const locales = response.body.data.map((doc) => doc.locale);
      expect(locales).toContain('en');
      expect(locales).toContain('fr');
      expect(locales).toContain('de');

      // Verify the titles are correct for each locale
      const titles = response.body.data.map((doc) => doc.title);
      expect(titles).toContain('English Article Title');
      expect(titles).toContain('Titre Article Français');
      expect(titles).toContain('Deutscher Artikel Titel');

      // Verify all entries have published status
      expect(response.body.data.every((doc) => doc.status === 'published')).toBe(true);
    });

    afterAll(async () => {
      // Clean up locales
      await strapi.db.query('plugin::i18n.locale').deleteMany({ code: { $ne: 'en' } });
      await strapi.destroy();
      await builder.cleanup();
    });
  });

  describe('Count Documents', () => {
    beforeAll(async () => {
      await builder.addContentTypes([articleModel, globalModel, tagModel, authorModel]).build();
      strapi = await createStrapiInstance();
      rq = await createAuthRequest({ strapi });
    });

    /**
     * GET /content-manager/homepage/count-documents
     * - Used to display a chart with the count of draft, modified and published documents in a widget on the Homepage.
     */
    it('returns the count of draft, modified and published documents', async () => {
      // Create draft, modified and published documents
      // Draft article
      await strapi.documents(articleUid).create({
        data: {
          title: 'The Paperback Writer',
        },
      });

      // Modified tag
      const tagModified = await strapi.documents(tagUid).create({
        data: {
          slug: 'Tag 1',
        },
      });
      await strapi.documents(tagUid).publish({
        documentId: tagModified.documentId,
      });
      await strapi.documents(tagUid).update({
        documentId: tagModified.documentId,
        data: {
          slug: 'Tag One',
        },
      });

      // Publish authors (draftAndPublish is false, so created documents are published by default)
      await strapi.documents(authorUid).create({
        data: {
          name: 'Stephen King',
        },
      });
      await strapi.documents(authorUid).create({
        data: {
          name: 'Michael Crichton',
        },
      });

      // Get the count of documents
      const response = await rq({
        method: 'GET',
        url: '/content-manager/homepage/count-documents',
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.data).toMatchObject({
        draft: 1,
        modified: 1,
        published: 2,
      });
    });

    afterAll(async () => {
      await strapi.destroy();
      await builder.cleanup();
    });
  });
});
