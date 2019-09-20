import { DatabaseManager, Repository } from 'strapi-dbal';

interface Strapi {
  db: DatabaseManager;

  query(model: string, plugin: string): Repository;
}

export default function createStrapi(opts: any): Strapi;

declare global {
  const strapi: Strapi;
}
