import { isEmpty } from 'lodash/fp';

import type { Core } from '@strapi/types';

import { resolveGraphqlServerConfig } from './config/resolve-graphql-server-config';
import { mountGraphqlTransport } from './graphql-transport/registry';

export async function bootstrap({ strapi }: { strapi: Core.Strapi }) {
  const schema = strapi.plugin('graphql').service('content-api').buildSchema();

  if (isEmpty(schema)) {
    strapi.log.warn('The GraphQL schema has not been generated because it is empty');

    return;
  }

  const { config } = strapi.plugin('graphql');

  const resolved = resolveGraphqlServerConfig(
    {
      apolloServer: config('apolloServer'),
      server: config('server'),
    },
    strapi.log
  );

  const { destroy } = await mountGraphqlTransport(resolved, { strapi, schema });

  strapi.plugin('graphql').destroy = destroy;
}
