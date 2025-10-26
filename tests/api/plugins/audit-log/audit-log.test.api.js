'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

// Define a simple test content type
const articleModel = {
  attributes: {
    title: { type: 'string' },
    content: { type: 'text' },
  },
  displayName: 'Article',
  singularName: 'article',
  pluralName: 'articles',
};

let strapi;
let rq;
const builder = createTestBuilder();

describe('Audit Log Plugin', () => {
  beforeAll(async () => {
    await builder.addContentType(articleModel).build();
    
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    // Clean up any existing data
    await strapi.db.query('api::article.article').deleteMany();
  });

  afterAll(async () => {
    if (strapi) {
      await strapi.destroy();
    }
    await builder.cleanup();
  });

  describe('Audit Log Creation', () => {
    test('Should create audit log when content is created', async () => {
      // Create a test article using Content Manager API
      const article = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/api::article.article',
        body: {
          title: 'Test Article',
          content: 'Test content',
        },
      });

      expect(article.statusCode).toBe(201);
      expect(article.body.data).toBeDefined();

      const articleId = article.body.data.documentId;

      // Wait for audit log to be created
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check audit logs
      const logs = await rq({
        method: 'GET',
        url: '/audit-log',
      });

      expect(logs.statusCode).toBe(200);
      expect(Array.isArray(logs.body)).toBe(true);
      expect(logs.body.length).toBeGreaterThan(0);
      
      // Find the log for this specific article creation
      const log = logs.body.find(l => 
        l.contentType === 'api::article.article' && 
        l.action === 'create' && 
        l.recordId === String(articleId)
      );
      
      expect(log).toBeDefined();
      expect(log.contentType).toBe('api::article.article');
      expect(log.action).toBe('create');
      expect(log.recordId).toBe(String(articleId));
      expect(log.payload).toBeDefined();
      expect(log.payload.after).toBeDefined();
      expect(log.payload.after.title).toBe('Test Article');
    });

    test('Should create audit log when content is updated', async () => {
      // Create a test article first
      const article = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/api::article.article',
        body: {
          title: 'Original Title',
          content: 'Original content',
        },
      });

      expect(article.statusCode).toBe(201);
      const articleId = article.body.data.documentId;

      // Update the article
      const updated = await rq({
        method: 'PUT',
        url: `/content-manager/collection-types/api::article.article/${articleId}`,
        body: {
          title: 'Updated Title',
          content: 'Original content',
        },
      });

      expect(updated.statusCode).toBe(200);

      // Wait for audit log
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check audit logs for update
      const logs = await rq({
        method: 'GET',
        url: '/audit-log',
      });

      expect(logs.statusCode).toBe(200);
      expect(Array.isArray(logs.body)).toBe(true);
      
      // Find the update log for this specific article
      const log = logs.body.find(l => 
        l.contentType === 'api::article.article' && 
        l.action === 'update' && 
        l.recordId === String(articleId)
      );
      
      expect(log).toBeDefined();
      expect(log.action).toBe('update');
      expect(log.payload).toBeDefined();
      expect(log.payload.before).toBeDefined();
      expect(log.payload.after).toBeDefined();
      expect(log.payload.before.title).toBe('Original Title');
      expect(log.payload.after.title).toBe('Updated Title');
      expect(log.payload.changed).toContain('title');
    });

    test('Should create audit log when content is deleted', async () => {
      // Create a test article first
      const article = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/api::article.article',
        body: {
          title: 'To Be Deleted',
          content: 'This will be deleted',
        },
      });

      expect(article.statusCode).toBe(201);
      const articleId = article.body.data.documentId;

      // Delete the article
      const deleted = await rq({
        method: 'DELETE',
        url: `/content-manager/collection-types/api::article.article/${articleId}`,
      });

      expect(deleted.statusCode).toBe(200);

      // Wait for audit log
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check audit logs for delete
      const logs = await rq({
        method: 'GET',
        url: '/audit-log',
      });

      expect(logs.statusCode).toBe(200);
      expect(Array.isArray(logs.body)).toBe(true);
      
      // Find the delete log for this specific article
      const log = logs.body.find(l => 
        l.contentType === 'api::article.article' && 
        l.action === 'delete' && 
        l.recordId === String(articleId)
      );
      
      expect(log).toBeDefined();
      expect(log.action).toBe('delete');
      expect(log.payload).toBeDefined();
      expect(log.payload.before).toBeDefined();
      expect(log.payload.before.title).toBe('To Be Deleted');
    });
  });

  describe('Audit Log API', () => {
    test('Should return audit logs as an array', async () => {
      const logs = await rq({
        method: 'GET',
        url: '/audit-log',
      });

      expect(logs.statusCode).toBe(200);
      expect(Array.isArray(logs.body)).toBe(true);
    });

    test('Should filter audit logs by content type', async () => {
      // Create a test article to ensure we have data
      await rq({
        method: 'POST',
        url: '/content-manager/collection-types/api::article.article',
        body: {
          title: 'Filter Test Article',
          content: 'Test content',
        },
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      const logs = await rq({
        method: 'GET',
        url: '/audit-log?contentType=api::article.article',
      });

      expect(logs.statusCode).toBe(200);
      expect(Array.isArray(logs.body)).toBe(true);
      
      if (logs.body.length > 0) {
        logs.body.forEach(log => {
          expect(log.contentType).toBe('api::article.article');
        });
      }
    });

    test('Should filter audit logs by action', async () => {
      // Create a test article
      await rq({
        method: 'POST',
        url: '/content-manager/collection-types/api::article.article',
        body: {
          title: 'Action Filter Test',
          content: 'Test content',
        },
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      const logs = await rq({
        method: 'GET',
        url: '/audit-log?action=create',
      });

      expect(logs.statusCode).toBe(200);
      expect(Array.isArray(logs.body)).toBe(true);
      
      if (logs.body.length > 0) {
        logs.body.forEach(log => {
          expect(log.action).toBe('create'); // FIXED: was 'delete'
        });
      }
    });

    test('Should support pagination', async () => {
      const logs = await rq({
        method: 'GET',
        url: '/audit-log?page=1&pageSize=10',
      });

      expect(logs.statusCode).toBe(200);
      expect(Array.isArray(logs.body)).toBe(true);
      // Pagination should limit results
      expect(logs.body.length).toBeLessThanOrEqual(10);
    });

    test('Should filter by multiple criteria', async () => {
      // Create a test article
      const article = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/api::article.article',
        body: {
          title: 'Multi-filter Test',
          content: 'Test content',
        },
      });

      const articleId = article.body.data.documentId;
      await new Promise(resolve => setTimeout(resolve, 500));

      const logs = await rq({
        method: 'GET',
        url: `/audit-log?contentType=api::article.article&action=create&recordId=${articleId}`,
      });

      expect(logs.statusCode).toBe(200);
      expect(Array.isArray(logs.body)).toBe(true);
      
      if (logs.body.length > 0) {
        const log = logs.body[0];
        expect(log.contentType).toBe('api::article.article');
        expect(log.action).toBe('create');
        expect(log.recordId).toBe(String(articleId));
      }
    });
  });
});