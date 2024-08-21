import { useEffect, useState } from 'react';

import { useTracking } from '@strapi/admin/strapi-admin';
import { stringify } from 'qs';

import { useConfig } from './useConfig';
import type { Query } from '../types';

const useModalQueryParams = (initialState: Partial<Query> = {}) => {
  const { trackUsage } = useTracking();
  const {
    config: { data: config },
  } = useConfig();

  const [queryObject, setQueryObject] = useState<Query>({
    page: 1,
    sort: 'updatedAt:DESC',
    pageSize: 10,
    filters: {
      $and: [],
    },
    ...initialState,
  });

  useEffect(() => {
    if (config && 'sort' in config && 'pageSize' in config) {
      setQueryObject((prevQuery) => ({
        ...prevQuery,
        sort: config.sort,
        pageSize: config.pageSize,
      }));
    }
  }, [config]);

  const handleChangeFilters = (nextFilters: Record<string, any>[]) => {
    trackUsage('didFilterMediaLibraryElements', {
      location: 'content-manager',
      filter: Object.keys(nextFilters[nextFilters.length - 1])[0],
    });
    setQueryObject((prev) => ({ ...prev, page: 1, filters: { $and: nextFilters } }));
  };

  const handleChangePageSize = (pageSize: Query['pageSize']) => {
    const size = pageSize ? parseInt(String(pageSize), 10) : 10;
    setQueryObject((prev) => ({ ...prev, pageSize: size, page: 1 }));
  };

  const handeChangePage = (page: Query['page']) => {
    setQueryObject((prev) => ({ ...prev, page }));
  };

  const handleChangeSort = (sort: Query['sort']) => {
    trackUsage('didSortMediaLibraryElements', {
      location: 'content-manager',
      sort,
    });
    setQueryObject((prev) => ({ ...prev, sort }));
  };

  const handleChangeSearch = (_q: Query['_q']) => {
    if (_q) {
      setQueryObject((prev) => ({ ...prev, _q, page: 1 }));
    } else {
      const newState: Partial<Query> = { page: 1 };

      Object.keys(queryObject).forEach((key) => {
        if (!['page', '_q'].includes(key)) {
          newState[key as keyof Query] = queryObject[key as keyof Query] as any;
        }
      });

      setQueryObject(newState);
    }
  };

  const handleChangeFolder = (folder?: Query['folder'], folderPath?: Query['folderPath']) => {
    setQueryObject((prev) => ({ ...prev, folder: folder ?? undefined, folderPath }));
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

export default useModalQueryParams;
