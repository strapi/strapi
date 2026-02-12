import { useEffect } from 'react';

import { useQueryParams } from '@strapi/admin/strapi-admin';
import get from 'lodash/get';
import set from 'lodash/set';
import { useLocation } from 'react-router-dom';

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

type PersistentQueryConfig = {
  keyPrefix: string;
  keysToPersist: PropertyPath[];
  pathnameInKey?: boolean;
};

const normalizeConfigs = (
  configs: PersistentQueryConfig | PersistentQueryConfig[]
): PersistentQueryConfig[] => {
  return (Array.isArray(configs) ? configs : [configs]).map((config) => ({
    ...config,
    pathnameInKey: config.pathnameInKey ?? true,
  }));
};

export const usePersistentPartialQueryParams = (
  config: PersistentQueryConfig | PersistentQueryConfig[]
) => {
  const { pathname } = useLocation();
  const [{ query }, setQuery] = useQueryParams();
  const configs = normalizeConfigs(config);

  // load query params from local storge
  useEffect(() => {
    const mergedFilteredQuery: Record<string, unknown> = {};

    for (const config of configs) {
      const localStorageKey = `${config.keyPrefix}${config.pathnameInKey ? pathname : ''}`;
      const savedQueryParams = window.localStorage.getItem(localStorageKey);
      if (!savedQueryParams) continue;

      let parsedSavedParams: Record<string, unknown>;
      try {
        parsedSavedParams = JSON.parse(savedQueryParams);
      } catch {
        continue;
      }
      if (Object.keys(parsedSavedParams).length === 0) continue;

      const filteredQuery = filterObjectKeys(parsedSavedParams, config.keysToPersist);
      Object.assign(mergedFilteredQuery, filteredQuery);
    }

    if (Object.keys(mergedFilteredQuery).length === 0) return;

    setQuery({ ...mergedFilteredQuery, ...query }, 'push', true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, config]);

  // update local storage
  useEffect(() => {
    for (const config of configs) {
      const paramsToPersist = filterObjectKeys(query, config.keysToPersist);
      if (Object.keys(paramsToPersist).length === 0) continue;
      const localStorageKey = `${config.keyPrefix}${config.pathnameInKey ? pathname : ''}`;
      window.localStorage.setItem(localStorageKey, JSON.stringify(paramsToPersist));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, pathname, config]);
};
