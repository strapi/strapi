import { buildAdmin, generateApp } from '@strapi/tests-shared';

import { UI_APP_NAME } from '../fixtures/app';

/**
 * Once per run: generate the app and build its admin panel with this run's env. Workers then
 * start it with `--no-build-admin` (see fixtures/app.ts).
 */
export default async function globalSetup() {
  const app = await generateApp({ name: UI_APP_NAME });
  await buildAdmin(app);
}
