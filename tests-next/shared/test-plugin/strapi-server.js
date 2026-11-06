'use strict';

/**
 * Test-only plugin for the /tests-next apps. It replaces the `auth: false` routes of the old
 * app template (`tests/app-template/src/api/config`).
 *
 * - It only loads when `STRAPI_TEST_PLUGIN=true` (see `testPluginConfigEntry` in
 *   tests-next/shared/src/test-plugin.ts), and refuses to load otherwise.
 * - Every route answers only to loopback requests (`plugin::tests.loopback` policy).
 *
 * Routes, under /api/tests:
 * - POST /rate-limit { enabled }  turn the admin login rate limit on or off
 * - POST /transfer-token          make sure the test transfer token exists (CLI transfer tests)
 * - GET  /features                feature flags and license features, to gate tests on them
 * - GET  /ai/calls, DELETE /ai/calls   what the fake AI translations provider received
 *
 * With `STRAPI_TEST_AI_PROVIDER=fake`, registers a fake AI translations provider. Strapi only
 * accepts a custom provider in EE with the `cms-byok-ai` license feature, and otherwise
 * disables every AI feature, so it is opt-in.
 */

const constants = require('./constants.json');
const { isLoopbackAddress } = require('./lib/loopback');
const { createFakeAiTranslationsProvider } = require('./lib/fake-ai-provider');

const isEnabled = () => process.env[constants.envVar] === 'true';

const fakeAi = createFakeAiTranslationsProvider();

/** True once Strapi has accepted the fake AI translations provider. */
let fakeAiRegistered = false;

const route = (method, path, handler) => ({
  method,
  path,
  handler: `tests.${handler}`,
  config: { auth: false, policies: ['plugin::tests.loopback'] },
});

module.exports = {
  register({ strapi }) {
    if (!isEnabled()) {
      throw new Error(
        `The tests plugin is loaded but ${constants.envVar} is not "true". It must never run outside the test apps.`
      );
    }

    if (process.env[constants.aiProviderEnvVar] === 'fake') {
      const aiTranslations = strapi.plugin('i18n').service('ai-translations');
      aiTranslations.registerProvider({ provider: fakeAi.provider });

      // registerProvider() returns silently when the license doesn't allow a custom provider,
      // and Strapi then disables every AI feature. Fail the boot rather than run tests on that.
      if (!aiTranslations.hasProvider()) {
        throw new Error(
          `${constants.aiProviderEnvVar}=fake, but Strapi rejected the fake AI translations provider. It needs EE with the "cms-byok-ai" license feature and admin.ai.enabled.`
        );
      }
      fakeAiRegistered = true;
    }
  },

  async bootstrap({ strapi }) {
    // The old app template turned the rate limit off on every boot; tests turn it back on.
    strapi.config.set('admin.rateLimit.enabled', false);
  },

  policies: {
    loopback: (policyContext) => isLoopbackAddress(policyContext.request.socket?.remoteAddress),
  },

  routes: {
    'content-api': {
      type: 'content-api',
      routes: [
        route('POST', '/rate-limit', 'setRateLimit'),
        route('POST', '/transfer-token', 'ensureTransferToken'),
        route('GET', '/features', 'features'),
        route('GET', '/ai/calls', 'aiCalls'),
        route('DELETE', '/ai/calls', 'clearAiCalls'),
      ],
    },
  },

  controllers: {
    tests: ({ strapi }) => ({
      setRateLimit(ctx) {
        const { enabled } = ctx.request.body ?? {};
        if (typeof enabled !== 'boolean') {
          return ctx.badRequest('Expected { "enabled": boolean }');
        }
        strapi.config.set('admin.rateLimit.enabled', enabled);
        ctx.body = { enabled };
      },

      async ensureTransferToken(ctx) {
        const { token } = strapi.service('admin::transfer');
        const accessKey = constants.transferTokenAccessKey;

        const exists = await token.exists({ accessKey: token.hash(accessKey) });
        if (!exists) {
          await token.create({
            name: 'TestToken',
            description: 'Transfer token of the test suites',
            lifespan: null,
            permissions: ['push', 'pull'],
            accessKey,
          });
        }
        ctx.body = { created: !exists };
      },

      features(ctx) {
        const config = strapi.features.config ?? {};
        const { future = {}, ...flags } = config;
        ctx.body = {
          future,
          flags,
          ee: {
            isEE: strapi.ee?.isEE === true,
            features: (strapi.ee?.features?.list?.() ?? []).map((feature) => feature.name),
          },
        };
      },

      aiCalls(ctx) {
        ctx.body = {
          registered: fakeAiRegistered,
          calls: fakeAi.calls,
        };
      },

      clearAiCalls(ctx) {
        fakeAi.calls.length = 0;
        ctx.status = 204;
      },
    }),
  },
};
