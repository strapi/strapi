import { createHash } from 'node:crypto';
import type { Core } from '@strapi/types';

import { PLUGIN_ID } from '../constants';
import type providerService from '../services/provider';
import type settingsService from '../services/settings';

/**
 * The admin settings Better Auth reads only when it is built: whether signing in needs a verified
 * email, and the sign-in providers. Every other setting is read live, so changing one needs no
 * rebuild. The engine is rebuilt when these change (`service('engine').ensureCurrent()`).
 */
export interface ProviderOptions {
  socialProviders: Record<string, unknown>;
  genericOAuth: unknown[];
  trustedProviders: string[];
  /**
   * What the fingerprint hashes besides what the names of its keys give away: the names of every
   * field a provider definition declares as `type: 'secret'` (a package's `certificate` is not
   * called a secret or a key), and the values those fields hold now, for a definition whose
   * `init` renames a field.
   */
  secrets?: { fields: string[]; values: string[] };
}

export interface StartupInputs {
  requireEmailVerification: boolean;
  providers: ProviderOptions;
}

/**
 * What the engine is built from before any setting has been read, in the shape `readStartupInputs`
 * answers with when nothing is configured (the provider service always reports its secrets), so
 * that an application with nothing configured does not rebuild the engine on its first request.
 */
export const emptyStartupInputs = (): StartupInputs => ({
  requireEmailVerification: false,
  providers: {
    socialProviders: {},
    genericOAuth: [],
    trustedProviders: [],
    secrets: { fields: [], values: [] },
  },
});

/**
 * Reads the inputs from the settings caches (`service('settings').get()` is cached, so this is
 * cheap enough for every authentication request), and the providers from `service('provider')`,
 * which keeps them the same way.
 */
export const readStartupInputs = async (strapi: Core.Strapi): Promise<StartupInputs> => {
  const settings = strapi.plugin(PLUGIN_ID).service('settings') as ReturnType<
    typeof settingsService
  >;
  const provider = strapi.plugin(PLUGIN_ID).service('provider') as ReturnType<
    typeof providerService
  >;
  const { signUp } = await settings.get();

  return {
    requireEmailVerification: signUp.requireEmailVerification,
    providers: await provider.options(),
  };
};

const SECRET_KEY = /secret|key|token|password/i;

const hash = (value: unknown) =>
  `sha256:${createHash('sha256').update(String(value)).digest('hex')}`;

/** JSON with sorted keys, and a hash where a secret would be. */
const stable = (
  value: unknown,
  declared: { fields: Set<string>; values: Set<string> },
  secret = false
): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => stable(item, declared, secret));
  }

  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([a], [b]) => a.localeCompare(b, 'en'))
        .map(([key, item]) => [
          key,
          stable(item, declared, secret || SECRET_KEY.test(key) || declared.fields.has(key)),
        ])
    );
  }

  const hashed =
    secret || (typeof value === 'string' && value !== '' && declared.values.has(value));

  return hashed && value !== null && value !== undefined && value !== '' ? hash(value) : value;
};

/**
 * A string that is the same for the same inputs and differs when any of them changes. A provider
 * secret appears as its hash, never as the text, so the fingerprint is safe to keep and to log.
 */
export const fingerprint = (inputs: StartupInputs): string =>
  JSON.stringify(
    stable(inputs, {
      fields: new Set(inputs.providers.secrets?.fields),
      values: new Set(inputs.providers.secrets?.values),
    })
  );
