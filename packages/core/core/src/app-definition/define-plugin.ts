import { PLUGIN_DEFINITION } from './brand';
import type { DefinedPlugin, DefinePluginInput } from './types';

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Validate a programmatic plugin definition and attach the
 * {@link PLUGIN_DEFINITION} brand. Pure: no side effects beyond validation.
 *
 * Where the name-keyed map form (`plugins: { 'users-permissions': ... }`) puts
 * the canonical name in the map key, `definePlugin` carries it on the value
 * (`name`). That unlocks the array form `plugins: [definePlugin({ ... })]`
 * while keeping the runtime UIDs (`plugin::<name>.*`) and the admin `resolve`
 * hint identical — both forms normalize to the same name-keyed map internally,
 * so no plugin-package changes are required (ADR-0006).
 *
 * @example
 * ```ts
 * import { defineApp, definePlugin } from '@strapi/strapi';
 * import usersPermissions from '@strapi/plugin-users-permissions';
 *
 * defineApp({
 *   plugins: [
 *     definePlugin({ name: 'users-permissions', plugin: usersPermissions }),
 *   ],
 * });
 * ```
 */
export const definePlugin = (input: DefinePluginInput): DefinedPlugin => {
  if (!isPlainObject(input)) {
    throw new TypeError('definePlugin(input) requires a plugin definition object');
  }

  const { name, plugin } = input;

  if (typeof name !== 'string' || name.length === 0) {
    throw new Error('A plugin definition requires a canonical `name`');
  }

  if (!KEBAB_CASE.test(name)) {
    throw new Error(`Plugin "${name}": \`name\` must be kebab-case (got "${name}")`);
  }

  if (plugin === undefined || plugin === null) {
    throw new Error(`Plugin "${name}" requires a \`plugin\` module (the strapi-server export)`);
  }

  if (typeof plugin !== 'function' && typeof plugin !== 'object') {
    throw new Error(`Plugin "${name}": \`plugin\` must be a strapi-server object or factory`);
  }

  return { ...input, [PLUGIN_DEFINITION]: true as const };
};
