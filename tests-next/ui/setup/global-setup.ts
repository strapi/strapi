import { prepareApp } from '@strapi/tests-shared';

import { UI_APP_NAME } from '../fixtures/app';
import { scaffoldUiSchema } from './schema';

/**
 * Once per run: generate the app and build its admin panel with this run's env, or reuse the ones
 * of the previous run when nothing that shapes them changed (see prepareApp). Then write its
 * content types (setup/schema.ts), which the admin build doesn't depend on. Workers then start it
 * with `--no-build-admin` (see fixtures/app.ts). TESTS_REGENERATE=true starts from a new app.
 */
export default async function globalSetup() {
  const start = Date.now();
  const { app, generated, built } = await prepareApp({ name: UI_APP_NAME });
  scaffoldUiSchema(app);
  const steps = [generated ? 'generated' : 'reused', built ? 'admin built' : 'admin reused'];
  console.log(`ui app ${steps.join(', ')} in ${((Date.now() - start) / 1000).toFixed(1)} s`);
}
