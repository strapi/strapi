/**
 * Start the programmatic ("Strapi as a primitive") server.
 *
 * `startStrapi(app)` serves the admin **panel** automatically when a build
 * exists at `<cwd>/build` (produced by `build-admin.ts` / `buildAdmin`), and
 * stays headless otherwise — the admin server module always loads either way.
 */
import { startStrapi } from '@strapi/strapi';
import app from './app';

startStrapi(app).catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
