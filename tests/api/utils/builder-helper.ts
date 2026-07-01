import type { Core } from '@strapi/types';

import { values } from 'lodash/fp';

import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';

type Builder = ReturnType<typeof createTestBuilder>;

export type BuilderHelperReturn = {
  builder: Builder;
  data: any;

  strapi: Core.Strapi;
  rq: {
    admin: ReturnType<typeof createAuthRequest>;
    // public: ReturnType<typeof createAuthRequest>;
  };
};

export type BuilderResources = {
  fixtures: any;
  schemas: any;
  locales?: any;
};

const addSchemasToBuilder = (schemas, builder) => {
  for (const component of values(schemas.components)) {
    builder.addComponent(component);
  }

  builder.addContentTypes(values(schemas['content-types']));
};

const bootstrapBuilder = ({ fixtures, schemas, locales }: BuilderResources, builder: Builder) => {
  addSchemasToBuilder(schemas, builder);

  if (locales) {
    builder.addFixtures('plugin::i18n.locale', locales);
  }

  Object.keys(schemas['content-types']).forEach((index) => {
    const fixture = fixtures['content-types'][index];
    const schema = schemas['content-types'][index];

    builder.addFixtures(schema.singularName, fixture);
  });
};

export const createTestSetup = async (
  resources: BuilderResources
): Promise<BuilderHelperReturn> => {
  const builder = createTestBuilder();
  bootstrapBuilder(resources, builder);
  await builder.build();

  const strapi = await createStrapiInstance();
  const rqAdmin = await createAuthRequest({ strapi });
  const data = await builder.sanitizedFixtures(strapi);

  return {
    builder,
    data,
    strapi,
    rq: {
      admin: rqAdmin,
      // public: rqAdmin, // TODO
    },
  };
};

export const destroyTestSetup = async ({ strapi, builder }) => {
  await strapi.destroy();
  await builder.cleanup();
};
