import type { Core } from '@strapi/types';

import type { BuilderConditionV2 } from '../../../../shared/builder/types';

/** A builder condition the loader registered, as version 2, and what it names that is gone */
export interface BuilderRecord {
  condition: BuilderConditionV2;
  stale: string[];
}

/**
 * The file of each builder condition, by the name it was registered under, relative to `src`: what
 * the loader found. Keyed by Strapi, because the loader runs from the plugin's `register()`, before
 * its services exist.
 */
const files = new WeakMap<Core.Strapi, Map<string, string>>();

/** The same condition as the builder shows it, by name */
const records = new WeakMap<Core.Strapi, Map<string, BuilderRecord>>();

const mapOf = <T>(registry: WeakMap<Core.Strapi, Map<string, T>>, strapi: Core.Strapi) => {
  let map = registry.get(strapi);

  if (!map) {
    map = new Map();
    registry.set(strapi, map);
  }

  return map;
};

export const builderFilesOf = (strapi: Core.Strapi) => mapOf(files, strapi);

export const builderRecordsOf = (strapi: Core.Strapi) => mapOf(records, strapi);

/** The builder condition registered under a name, as version 2, or undefined for anything else */
export const builderConditionOf = (
  strapi: Core.Strapi,
  name: string
): BuilderConditionV2 | undefined => builderRecordsOf(strapi).get(name)?.condition;
