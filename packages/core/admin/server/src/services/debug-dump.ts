import os from 'os';
import type { Core } from '@strapi/types';
import { scrub } from '../utils/debug-dump/redact';
import type { DebugDumpPayload } from '../../../shared/contracts/admin';

// Only these process.env keys are ever emitted (never the whole environment).
const ENV_ALLOWLIST = [
  'NODE_ENV',
  'STRAPI_HOSTING',
  'STRAPI_DISABLE_LICENSE_PING',
  'STRAPI_DISABLE_EE',
] as const;

// Sensitive config subtrees masked wholesale (in addition to the key/value scrubber).
const SENSITIVE_CONFIG_PATHS = [
  'server.app.keys',
  'database.connection.connection',
  'admin.auth.secret',
  'admin.apiToken.salt',
  'admin.transfer.token.salt',
  'admin.secrets',
  'plugin::email.providerOptions',
  'plugin::email.settings',
  'plugin::upload.providerOptions',
];

const debugDumpService = ({ strapi }: { strapi: Core.Strapi }) => ({
  async generate(): Promise<DebugDumpPayload> {
    const appRoot: string = strapi.config.get('dirs.app.root', '') as string;
    const homeDir = os.homedir();

    const packageJson = (strapi.config.get('info', {}) ?? {}) as Record<string, unknown>;

    // The config provider (packages/core/core/src/services/config.ts) exposes
    // every config namespace as an own-enumerable property alongside its
    // get/set/has methods. `get('', ...)` does NOT return the root, so build
    // the full tree from the provider's own keys minus those three methods.
    const rawConfig: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(
      strapi.config as unknown as Record<string, unknown>
    )) {
      if (key === 'get' || key === 'set' || key === 'has') {
        continue;
      }
      rawConfig[key] = value;
    }
    const fullConfig = scrub(rawConfig, {
      appRoot,
      homeDir,
      extraPaths: SENSITIVE_CONFIG_PATHS,
    }) as Record<string, unknown>;

    const env: Record<string, string | undefined> = {};
    for (const key of ENV_ALLOWLIST) {
      env[key] = process.env[key];
    }

    let uploadPrivate = false;
    try {
      uploadPrivate = await strapi.plugin('upload').provider.isPrivate();
    } catch {
      uploadPrivate = false;
    }

    const payload: DebugDumpPayload = {
      dumpVersion: 1,
      generatedAt: new Date().toISOString(),
      strapi: {
        version: strapi.config.get('info.strapi', null) as string | null,
        edition: strapi.EE ? 'EE' : 'CE',
        // window.strapi.projectType is client-side; on the server derive from plan.
        projectType: strapi.EE ? 'Enterprise' : 'Community',
        environment: strapi.config.get('environment', '') as string,
        autoReload: strapi.config.get('autoReload', false) as boolean,
      },
      system: {
        nodeVersion: process.version,
        os: { type: os.type(), platform: os.platform(), arch: os.arch(), release: os.release() },
        isHostedOnStrapiCloud: process.env.STRAPI_HOSTING === 'strapi.cloud',
      },
      database: strapi.db.getInfo(),
      plugins: Object.keys(strapi.plugins),
      providers: {
        upload: {
          name: strapi.config.get('plugin::upload.provider', 'local'),
          isPrivate: uploadPrivate,
        },
        email: { name: strapi.config.get('plugin::email.provider', undefined) },
      },
      contentModel: {
        counts: {
          contentTypes: Object.keys(strapi.contentTypes).length,
          components: Object.keys(strapi.components).length,
        },
        contentTypes: scrub(Object.values(strapi.contentTypes), { appRoot, homeDir }) as unknown[],
        components: scrub(Object.values(strapi.components), { appRoot, homeDir }) as unknown[],
      },
      customizations: strapi.getCustomizations(),
      config: fullConfig,
      packageJson: scrub(packageJson, { appRoot, homeDir }) as Record<string, unknown>,
      env,
    };

    if (strapi.EE) {
      payload.license = {
        type: strapi.ee.type,
        isTrial: strapi.ee.isTrial,
        expireAt: strapi.ee.expireAt ?? null,
        seats: strapi.ee.seats ?? null,
        subscriptionId: strapi.ee.subscriptionId ?? null,
        features: strapi.ee.features.list(),
        entitlements: strapi.ee.entitlements.list(),
      };
    }

    return payload;
  },
});

export default debugDumpService;
