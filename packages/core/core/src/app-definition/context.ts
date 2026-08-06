import type { AppDefinition } from './types';

/**
 * Per-instance holder for the programmatic app definition.
 *
 * A `WeakMap` keyed by the `Strapi` instance keeps the definition reachable to
 * the loaders without widening the public `Core.Strapi` interface. Set during
 * construction (when `createStrapi({ app })` is used) and read by
 * `loadApplicationContext` to choose the programmatic branch.
 */
const appDefinitions = new WeakMap<object, AppDefinition>();

export const setAppDefinition = (strapi: object, app: AppDefinition): void => {
  appDefinitions.set(strapi, app);
};

export const getAppDefinition = (strapi: object): AppDefinition | undefined =>
  appDefinitions.get(strapi);
