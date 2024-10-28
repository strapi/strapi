import * as React from 'react';

import { useTracking } from '@strapi/admin/strapi-admin';
import { stringify } from 'qs';

import { useConfig } from './useConfig';

import type { Query, FilterCondition } from '../../../shared/contracts/files';

export const useModalQueryParams = (initialState?: Partial<Query>) => {
  const { trackUsage } = useTracking();
  const {
    config: { data: config },
  } = useConfig();

  const [queryObject, setQueryObject] = React.useState<Query>({
    page: 1,
    sort: 'updatedAt:DESC',
    pageSize: 10,
    filters: {
      $and: [],
    },
    ...initialState,
  });

  React.useEffect(() => {
    if (config && 'sort' in config && 'pageSize' in config) {
      setQueryObject((prevQuery) => ({
        ...prevQuery,
        sort: config.sort,
        pageSize: config.pageSize,
      }));
    }
  }, [config]);

  const handleChangeFilters = (nextFilters: FilterCondition<string>[]) => {
    if (nextFilters) {
      trackUsage('didFilterMediaLibraryElements', {
        location: 'content-manager',
        filter: Object.keys(nextFilters[nextFilters.length - 1])[0],
      });
      setQueryObject((prev) => ({ ...prev, page: 1, filters: { $and: nextFilters } }));
    }
  };

  const handleChangePageSize = (pageSize: Query['pageSize']) => {
    setQueryObject((prev) => ({
      ...prev,
      pageSize: typeof pageSize === 'string' ? parseInt(pageSize, 10) : pageSize,
      page: 1,
    }));
  };

  const handeChangePage = (page: Query['page']) => {
    setQueryObject((prev) => ({ ...prev, page }));
  };

  const handleChangeSort = (sort: Query['sort']) => {
    if (sort) {
      trackUsage('didSortMediaLibraryElements', {
        location: 'content-manager',
        sort,
      });
      setQueryObject((prev) => ({ ...prev, sort }));
    }
  };

  const handleChangeSearch = (_q: Query['_q'] | null) => {
    if (_q) {
      setQueryObject((prev) => ({ ...prev, _q, page: 1 }));
    } else {
      const newState: Query = { page: 1 };

      Object.keys(queryObject).forEach((key) => {
        if (!['page', '_q'].includes(key)) {
          (newState as Record<string, string | number | undefined>)[key] = (
            queryObject as Record<string, string | number | undefined>
          )[key];
        }
      });

      setQueryObject(newState);
    }
  };

  const handleChangeFolder = (folder: Query['folder'], folderPath: Query['folderPath']) => {
    setQueryObject((prev) => ({ ...prev, folder: folder ?? null, folderPath }));
  };

  return [
    { queryObject, rawQuery: stringify(queryObject, { encode: false }) },
    {
      onChangeFilters: handleChangeFilters,
      onChangeFolder: handleChangeFolder,
      onChangePage: handeChangePage,
      onChangePageSize: handleChangePageSize,
      onChangeSort: handleChangeSort,
      onChangeSearch: handleChangeSearch,
    },
  ];
};
