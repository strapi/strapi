import { useEffect } from 'react';

import { usePersistentStateScope, useQueryParams } from '@strapi/admin/strapi-admin';
import get from 'lodash/get';
import set from 'lodash/set';

type PropertyPath = Parameters<typeof get>[1];

interface PersistentQueryConfigEntry {
  paths: PropertyPath[];
  scoped?: boolean;
  legacyKey?: string;
}

const filterObjectKeys = (obj: object, keys: PropertyPath[]) => {
  const result: Record<string, unknown> = {};

  for (const path of keys) {
    const value = get(obj, path);

    if (value !== undefined) {
      set(result, path, value);
    }
  }

  return result;
};

export type PersistentQueryConfig = Record<string, PersistentQueryConfigEntry>;

const normalizeConfigEntry = (
  key: string,
  entry: PersistentQueryConfigEntry,
  scope: string | false | undefined
) => {
  const { paths, legacyKey } = entry;
  const isScoped = entry.scoped === true && !!scope;

  return {
    key: isScoped ? `${key}:${scope}` : key,
    legacyKey,
    paths,
  };
};

export const usePersistentPartialQueryParams = (config: PersistentQueryConfig) => {
  const scope = usePersistentStateScope();
  const [{ query }, setQuery] = useQueryParams();
  const clonedConfig = JSON.stringify(config);

  // migrate query params from previous keys before loading them
  useEffect(() => {
    for (const [keyPrefix, entry] of Object.entries(config)) {
      const { key, legacyKey } = normalizeConfigEntry(keyPrefix, entry, scope);
      if (!legacyKey || legacyKey === key) continue;

      try {
        const savedQueryParams = window.localStorage.getItem(key);
        if (savedQueryParams) continue;

        const legacyQueryParams = window.localStorage.getItem(legacyKey);
        if (!legacyQueryParams) continue;

        window.localStorage.setItem(key, legacyQueryParams);
        window.localStorage.removeItem(legacyKey);
      } catch {
        continue;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clonedConfig, scope]);

  // load query params from local storage
  useEffect(() => {
    const mergedFilteredQuery: Record<string, unknown> = {};

    for (const [keyPrefix, entry] of Object.entries(config)) {
      const { key, paths } = normalizeConfigEntry(keyPrefix, entry, scope);

      const savedQueryParams = window.localStorage.getItem(key);
      if (!savedQueryParams) continue;

      let parsedSavedParams: Record<string, unknown>;
      try {
        parsedSavedParams = JSON.parse(savedQueryParams);
      } catch {
        continue;
      }
      if (Object.keys(parsedSavedParams).length === 0) continue;

      const filteredQuery = filterObjectKeys(parsedSavedParams, paths);
      Object.assign(mergedFilteredQuery, filteredQuery);
    }

    if (Object.keys(mergedFilteredQuery).length === 0) return;

    setQuery({ ...mergedFilteredQuery, ...query }, 'push', true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clonedConfig, scope]);

  // update local storage
  useEffect(() => {
    for (const [keyPrefix, entry] of Object.entries(config)) {
      const { key, paths } = normalizeConfigEntry(keyPrefix, entry, scope);

      const paramsToPersist = filterObjectKeys(query, paths);
      if (Object.keys(paramsToPersist).length === 0) continue;
      window.localStorage.setItem(key, JSON.stringify(paramsToPersist));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, clonedConfig, scope]);
};
