import { useEffect, useState } from 'react';

import {
  deepEncodeQueryValues,
  usePersistentStateScope,
  useQueryParams,
} from '@strapi/admin/strapi-admin';
import get from 'lodash/get';
import set from 'lodash/set';
import { stringify } from 'qs';
import { useLocation, useNavigate } from 'react-router-dom';

type PropertyPath = Parameters<typeof get>[1];

interface PersistentQueryConfigEntry {
  paths: PropertyPath[];
  scoped?: boolean;
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
  const { paths } = entry;
  const isScoped = entry.scoped === true && !!scope;

  return {
    key: isScoped ? `${key}:${scope}` : key,
    paths,
  };
};

export const usePersistentPartialQueryParams = (config: PersistentQueryConfig) => {
  const scope = usePersistentStateScope();
  const [{ query }] = useQueryParams();
  const location = useLocation();
  const navigate = useNavigate();
  const clonedConfig = JSON.stringify(config);
  const [isHydrated, setIsHydrated] = useState(false);

  // load query params from local storge
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

    if (Object.keys(mergedFilteredQuery).length > 0) {
      const nextQuery: Record<string, unknown> = { ...mergedFilteredQuery, ...query };

      if (nextQuery.filters !== undefined) {
        // The URL is written without encoding, as `setQuery` does everywhere, and that cannot change without breaking changes.
        // This ensures that, when reading the persisted values and writing them in the URI, they are encoded properly.
        // We are only encoding the filters because we know they can hold values with special characters. We didn't bother
        // with the other query params because as of today, they are not expected to hold such values.
        nextQuery.filters = deepEncodeQueryValues(nextQuery.filters);
      }

      // What `setQuery(nextQuery, 'push', true)` does, but keeping the history entry's state: a page
      // opened with state (e.g. `forceValidation` from Content Releases) must still find it there.
      navigate(
        { search: stringify(nextQuery, { encode: false }) },
        { replace: true, state: location.state }
      );
    }
    setIsHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clonedConfig, scope]);

  // update local storage
  useEffect(() => {
    for (const [keyPrefix, entry] of Object.entries(config)) {
      const { key, paths } = normalizeConfigEntry(keyPrefix, entry, scope);

      const paramsToPersist = filterObjectKeys(query, paths);
      if (Object.keys(paramsToPersist).length === 0) {
        window.localStorage.removeItem(key);
        continue;
      }

      window.localStorage.setItem(key, JSON.stringify(paramsToPersist));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, clonedConfig, scope]);

  return { isHydrated };
};
