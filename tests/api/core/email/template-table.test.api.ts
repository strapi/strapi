import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import type { Core } from '@strapi/types';

const builder = createTestBuilder();

// A project's own `api::email-template` type has the table `email_templates`. The email plugin's
// stored templates must live in another table, or the two would be one table and Strapi would not start.
const projectTemplateModel = {
  singularName: 'email-template',
  pluralName: 'email-templates',
  displayName: 'Email template',
  kind: 'collectionType',
  attributes: {
    title: {
      type: 'string',
    },
  },
};

describe('Email templates next to a project content type of the same name', () => {
  let strapi: Core.Strapi;

  beforeAll(async () => {
    await builder.addContentType(projectTemplateModel).build();

    strapi = await createStrapiInstance();
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('Strapi starts with both content types in separate tables', async () => {
    const project = strapi.getModel('api::email-template.email-template');
    const plugin = strapi.getModel('plugin::email.template');

    expect(project.collectionName).toBe('email_templates');
    expect(plugin.collectionName).toBe('strapi_email_templates');

    const tables = strapi.db.metadata.get('api::email-template.email-template').tableName;
    expect(tables).toBe('email_templates');
    expect(strapi.db.metadata.get('plugin::email.template').tableName).toBe(
      'strapi_email_templates'
    );

    await expect(strapi.db.query('api::email-template.email-template').count()).resolves.toBe(0);
    await expect(strapi.db.query('plugin::email.template').count()).resolves.toBeGreaterThanOrEqual(
      0
    );
  });
});
