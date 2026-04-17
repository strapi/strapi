import { useEffect } from 'react';

import { useQueryParams } from '@strapi/admin/strapi-admin';
import get from 'lodash/get';
import set from 'lodash/set';
import { useLocation } from 'react-router-dom';

type PropertyPath = Parameters<typeof get>[1];

interface PersistentQueryParamsOptions {
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

export const usePersistentPartialQueryParams = (
  keyPrefix: string,
  keysToPersist: PropertyPath[],
  pathnameInKey = true,
  { legacyKey }: PersistentQueryParamsOptions = {}
) => {
  const { pathname } = useLocation();
  const [{ query }, setQuery] = useQueryParams();
  const localStorageKey = `${keyPrefix}${pathnameInKey ? pathname : ''}`;

  // migrate query params from a previous key before loading them
  useEffect(() => {
    if (!legacyKey || legacyKey === localStorageKey) return;

    try {
      const savedQueryParams = window.localStorage.getItem(localStorageKey);
      if (savedQueryParams) return;

      const legacyQueryParams = window.localStorage.getItem(legacyKey);
      if (!legacyQueryParams) return;

      window.localStorage.setItem(localStorageKey, legacyQueryParams);
      window.localStorage.removeItem(legacyKey);
    } catch {
      return;
    }
  }, [legacyKey, localStorageKey]);

  // load query params from local storage
  useEffect(() => {
    const savedQueryParams = window.localStorage.getItem(localStorageKey);
    if (!savedQueryParams) return;

    let parsedSavedParams: Record<string, unknown>;
    try {
      parsedSavedParams = JSON.parse(savedQueryParams);
    } catch {
      return;
    }
    if (Object.keys(parsedSavedParams).length === 0) return;

    const filteredQuery = filterObjectKeys(parsedSavedParams, keysToPersist);
    setQuery({ ...filteredQuery, ...query }, 'push', true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStorageKey]);

  // update local storage
  useEffect(() => {
    const paramsToPersist = filterObjectKeys(query, keysToPersist);
    if (Object.keys(paramsToPersist).length === 0) return;
    window.localStorage.setItem(localStorageKey, JSON.stringify(paramsToPersist));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, keysToPersist]);
};
