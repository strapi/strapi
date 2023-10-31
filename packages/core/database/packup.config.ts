// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from '@strapi/pack-up';

export default defineConfig({
  externals: [
    /**
     * Knex dependencies, if we don't mark these as external
     * they will be included in the bundle which means they
     * will fail...
     */
    'knex/lib/query/querybuilder',
    'knex/lib/raw',
  ],
  runtime: 'node',
});
