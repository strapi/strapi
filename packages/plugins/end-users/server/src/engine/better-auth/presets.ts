/**
 * Turns a generic OAuth provider config that names a Better Auth preset (`strapiPreset`, what a
 * built-in preset's `init` answers in `providers/built-in.ts`) into the preset's own config.
 * The provider definitions carry no Better Auth import, this is where the presets are called.
 */
import {
  auth0,
  gumroad,
  hubspot,
  keycloak,
  line,
  microsoftEntraId,
  okta,
  patreon,
  slack,
  yandex,
} from 'better-auth/plugins';

const PRESETS: Record<string, (options: never) => object> = {
  auth0,
  gumroad,
  hubspot,
  keycloak,
  line,
  microsoftEntraId,
  okta,
  patreon,
  slack,
  yandex,
};

/**
 * `config` as it is when it names no preset. With one, the preset's config replaces it, except
 * that what `config` sets besides `strapiPreset` (`pkce`, `overrideUserInfo`, `providerId`) stays
 * and wins; the preset's own `providerId` is dropped, the definition's id stands for it.
 */
export const resolvePreset = (config: unknown): unknown => {
  if (typeof config !== 'object' || config === null || !('strapiPreset' in config)) {
    return config;
  }

  const { strapiPreset, ...rest } = config as {
    strapiPreset: { name: string; options: Record<string, unknown> };
  } & Record<string, unknown>;

  const make = Object.hasOwn(PRESETS, strapiPreset.name) ? PRESETS[strapiPreset.name] : undefined;

  if (!make) {
    throw new Error(`"${strapiPreset.name}" is not a generic OAuth preset of Better Auth.`);
  }

  const { providerId, ...preset } = make(strapiPreset.options as never) as Record<string, unknown>;

  return { ...rest, ...preset, ...pick(rest, ['overrideUserInfo', 'providerId']) };
};

const pick = (from: Record<string, unknown>, keys: string[]) =>
  Object.fromEntries(keys.filter((key) => key in from).map((key) => [key, from[key]]));
