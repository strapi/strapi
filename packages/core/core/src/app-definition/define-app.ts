import { APP_DEFINITION, isDiskSource } from './brand';
import type { AppDefinition, AppInput } from './types';

/**
 * The result of {@link defineApp}: the loose {@link AppDefinition} the loaders
 * consume, intersected with the original input so its literal types (content-type
 * names, attribute shapes, component uids) are preserved on `typeof app`. That is
 * what lets {@link RegisterContentTypes}/{@link RegisterComponents} infer the
 * registry from `typeof app`.
 *
 * The brand comes from {@link AppDefinition} (not a separate `& { brand }`) so it
 * is always present even when TypeScript infers `TInput` through a contextual
 * type at the call site.
 */
export type BrandedApp<TInput extends AppInput> = AppDefinition & TInput;

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Validate the high-level shape of an app definition. This is intentionally
 * lightweight — deep validation (content types, config) happens later in the
 * dedicated normalizer / config validators. The goal here is to fail fast on
 * obvious misuse with a clear message.
 */
const validateShape = (def: AppInput): void => {
  if (!isPlainObject(def)) {
    throw new TypeError('defineApp(definition) requires a definition object');
  }

  const { contentTypes, components, routes, plugins, from } = def;

  if (contentTypes !== undefined && !Array.isArray(contentTypes) && !isDiskSource(contentTypes)) {
    throw new TypeError('`contentTypes` must be an array or a fromDisk() source');
  }

  if (components !== undefined && !Array.isArray(components) && !isDiskSource(components)) {
    throw new TypeError('`components` must be an array or a fromDisk() source');
  }

  if (
    routes !== undefined &&
    typeof routes !== 'function' &&
    !Array.isArray(routes) &&
    !isDiskSource(routes)
  ) {
    throw new TypeError('`routes` must be a builder function, an array, or a fromDisk() source');
  }

  if (
    plugins !== undefined &&
    !isPlainObject(plugins) &&
    !Array.isArray(plugins) &&
    !isDiskSource(plugins)
  ) {
    throw new TypeError(
      '`plugins` must be a record of plugin entries, an array of definePlugin() results, or a fromDisk() source'
    );
  }

  if (from !== undefined && !isDiskSource(from)) {
    throw new TypeError('`from` must be a fromDisk() source');
  }

  for (const lifecycle of ['register', 'bootstrap', 'destroy'] as const) {
    const value = def[lifecycle];
    if (value !== undefined && typeof value !== 'function') {
      throw new TypeError(`\`${lifecycle}\` must be a function`);
    }
  }

  for (const resource of ['controllers', 'services', 'policies', 'middlewares'] as const) {
    const value = def[resource];
    if (value !== undefined && !isPlainObject(value) && !isDiskSource(value)) {
      throw new TypeError(`\`${resource}\` must be a record or a fromDisk() source`);
    }
  }
};

/**
 * Validate the definition shape, attach the {@link APP_DEFINITION} brand, and
 * return it untouched-but-typed. Pure: no side effects beyond validation.
 *
 * The `const` type parameter preserves the literal types of the definition
 * (content-type names, attribute shapes, component uids), so `typeof app` can be
 * fed to {@link RegisterContentTypes}/{@link RegisterComponents} for end-to-end
 * `strapi.documents(...)` type inference (Phase 3). Runtime behavior is
 * unchanged — the returned value is still a plain, branded {@link AppDefinition}.
 */
export const defineApp = <const TInput extends AppInput>(def: TInput): BrandedApp<TInput> => {
  validateShape(def);

  return { ...def, [APP_DEFINITION]: true as const } as unknown as BrandedApp<TInput>;
};
