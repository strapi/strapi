import path from 'node:path';

// The plugin needs its own package.json for Strapi to load it, so ESLint sees it as another
// package. It is part of this workspace and never published: relative imports are fine.
/* eslint-disable import/no-relative-packages */
import constants from '../test-plugin/constants.json';

export { createFakeAiTranslationsProvider } from '../test-plugin/lib/fake-ai-provider';
export { isLoopbackAddress } from '../test-plugin/lib/loopback';
/* eslint-enable import/no-relative-packages */

/** The test-only plugin loaded into every generated app (tests-next/shared/test-plugin). */
export const TEST_PLUGIN_DIR = path.resolve(__dirname, '../test-plugin');

/** The plugin only loads, and only answers, when this env var is "true". */
export const TEST_PLUGIN_ENV_VAR = constants.envVar;

/** Set it to "fake" to register the fake AI translations provider (EE with `cms-byok-ai`). */
export const TEST_AI_PROVIDER_ENV_VAR = constants.aiProviderEnvVar;

/** Access key of the transfer token that POST /api/tests/transfer-token creates. */
export const TEST_TRANSFER_TOKEN_ACCESS_KEY = constants.transferTokenAccessKey;

/**
 * `config/plugins.js` entry of the generated apps. Strapi doesn't load a plugin whose
 * `enabled` is false, so outside the test env the plugin code never runs.
 */
export const testPluginConfigEntry = () =>
  `tests: { enabled: process.env.${TEST_PLUGIN_ENV_VAR} === 'true', resolve: ${JSON.stringify(
    TEST_PLUGIN_DIR
  )} },`;
