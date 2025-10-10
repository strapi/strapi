'use strict';

// Helpers.
const { createStrapiInstance } = require('api-tests/strapi');
const request = require('supertest');

let strapi;

describe('Test Graphql Utils', () => {
  beforeAll(async () => {
    strapi = await createStrapiInstance();
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  test('Load Graphql playground', async () => {
    const supertestAgent = request.agent(strapi.server.httpServer);
    const res = await supertestAgent.get('/graphql').set('accept', 'text/html');

    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('<title>Apollo Server</title>');
  });
});
