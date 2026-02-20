import { useEffect } from 'react';

import { useQueryParams } from '@strapi/admin/strapi-admin';
import get from 'lodash/get';
import set from 'lodash/set';

type PropertyPath = Parameters<typeof get>[1];

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

type PersistentQueryConfig = Record<string, PropertyPath[]>;

export const usePersistentPartialQueryParams = (config: PersistentQueryConfig) => {
  const [{ query }, setQuery] = useQueryParams();

  // load query params from local storge
  useEffect(() => {
    const mergedFilteredQuery: Record<string, unknown> = {};

    for (const [key, paths] of Object.entries(config)) {
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
  }, [config]);

  // update local storage
  useEffect(() => {
    for (const [key, paths] of Object.entries(config)) {
      const paramsToPersist = filterObjectKeys(query, paths);
      if (Object.keys(paramsToPersist).length === 0) continue;
      window.localStorage.setItem(key, JSON.stringify(paramsToPersist));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, config]);
};
