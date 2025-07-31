import { useEffect } from 'react';

import { useQueryParams } from '@strapi/admin/strapi-admin';
import { useLocation } from 'react-router-dom';

const filterObjectKeys = (obj: object, keys: string[]) => {
  return keys.reduce(
    (prev, curr) => {
      if (Object.hasOwn(obj, curr)) {
        return {
          ...prev,
          // @ts-expect-error – this is fine, if you want to fix it, please do.
          [curr]: obj[curr],
        };
      }

      return prev;
    },
    {} as Record<string, unknown>
  );
};

export const usePersistentPartialQueryParams = (keyPrefix: string, keysToPersist: string[]) => {
  const { pathname } = useLocation();
  const [{ query }, setQuery] = useQueryParams();
  const localStorageKey = `${keyPrefix}${pathname}`;

  // load query params from local storge
  useEffect(() => {
    const savedQueryParams = window.localStorage.getItem(localStorageKey);
    if (!savedQueryParams) return;

    let parsedSavedParams;
    try {
      parsedSavedParams = JSON.parse(savedQueryParams) as object;
    } catch {
      return;
    }
    if (Object.keys(parsedSavedParams).length === 0) return;

    const filteredQuery = filterObjectKeys(parsedSavedParams, keysToPersist);
    setQuery({ ...query, ...filteredQuery }, 'push', true);
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
