import type { Core } from '@strapi/types';

import { ADMIN_ACTIONS, SETTINGS_ACTIONS } from '../admin-actions';
import { PLUGIN_ID } from '../constants';
import migrationRoutes from '../routes/admin/migration';
import { registerMigrationControl } from './control';

const OWN = `plugin::${PLUGIN_ID}.`;
const MIGRATION = `${OWN}migration`;

type Registry = {
  get: (uid: string) => unknown;
  keys: () => string[];
  getAll: (namespace?: string) => Record<string, unknown>;
};

/**
 * The migration routes' admin actions: only these two are registered, the other actions of the
 * plugin are not
 */
const CHECK_ACTIONS = ADMIN_ACTIONS.filter((action) =>
  [SETTINGS_ACTIONS.read, SETTINGS_ACTIONS.update].includes(
    `plugin::${action.pluginName}.${action.uid}` as never
  )
);

/**
 * Takes the plugin's own entries out of one registry's answers, but for `keep`. The types, the
 * controllers and the services are read from the plugin's files before any code of it runs (and a
 * project's profile extension makes a type of its own), so they are in the registries already.
 * Nothing registered later can take them out, but what the registries answer decides what is used:
 * the database is built from the content types it lists, so a type it no longer lists gets no
 * table, and a controller or service built over such a type is never built.
 */
const hideOwn = (strapi: Core.Strapi, name: string, keep: readonly string[] = []) => {
  const registry = strapi.get(name) as Registry;
  const { get, getAll, keys } = registry;
  const hidden = (uid: unknown) =>
    typeof uid === 'string' && uid.startsWith(OWN) && !keep.includes(uid);

  registry.get = (uid) => (hidden(uid) ? undefined : get.call(registry, uid));
  registry.keys = () => keys.call(registry).filter((uid) => !hidden(uid));
  registry.getAll = (namespace) => {
    const all = getAll.call(registry, namespace);
    const visible: Record<string, unknown> = {};

    // The controllers' and services' maps build each one when it is read: only the keys are read here
    for (const uid of Object.keys(all).filter((key) => !hidden(key))) {
      Object.defineProperty(visible, uid, { enumerable: true, get: () => all[uid] });
    }

    return visible;
  };
};

/**
 * What `register` does in check mode, all of it: the start control (which refuses check mode
 * without Users & Permissions), then the plugin goes quiet. No engine, content type, strategy,
 * middleware, GraphQL type or compatibility check; of its routes only the migration's admin routes
 * stay.
 */
export const registerCheckMode = (strapi: Core.Strapi): void => {
  registerMigrationControl(strapi);
  hideOwn(strapi, 'content-types');
  hideOwn(strapi, 'controllers', [MIGRATION]);
  hideOwn(strapi, 'services', [MIGRATION]);

  const plugin = strapi.plugin(PLUGIN_ID);

  const { admin } = plugin.routes as Record<string, Core.Router>;

  plugin.routes = { admin: { ...admin, routes: migrationRoutes.routes } } as typeof plugin.routes;
};

/** What `bootstrap` does in check mode: the two admin actions the migration routes need */
export const bootstrapCheckMode = async (strapi: Core.Strapi): Promise<void> => {
  await strapi.service('admin::permission').actionProvider.registerMany(CHECK_ACTIONS);
};
