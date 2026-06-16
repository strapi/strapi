/**
 * Build the admin **panel** for the programmatic ("Strapi as a primitive") app.
 *
 * `buildAdmin({ app })` is the Phase 2 façade over Strapi's node build pipeline:
 * it accepts the `defineApp(...)` definition directly (no `config/**` /
 * `src/api/**` scan) and derives the frontend plugin set from `app.plugins`.
 * The compiled panel lands in `<cwd>/build`, which `startStrapi` then serves.
 */
import { buildAdmin } from '@strapi/strapi';
import app from './app';

buildAdmin({ app })
  .then(() => {
    // eslint-disable-next-line no-console
    console.log('Admin panel built.');
    process.exit(0);
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  });
