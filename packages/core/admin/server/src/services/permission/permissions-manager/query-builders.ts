import { engine } from '@strapi/permissions';

// The builders moved to `@strapi/permissions`, which the Content API shares with admin
const { buildCaslQuery, buildStrapiQuery } = engine;

export { buildCaslQuery, buildStrapiQuery };
