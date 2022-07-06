import { useState } from 'react';
import { useTracking } from '@strapi/helper-plugin';

import { stringify } from 'qs';

const useModalQueryParams = initialState => {
  const { trackUsage } = useTracking();
  const [queryObject, setQueryObject] = useState({
    page: 1,
    sort: 'updatedAt:DESC',
    pageSize: 10,
    filters: {
      $and: [],
    },
    ...initialState,
  });

  const handleChangeFilters = nextFilters => {
    trackUsage('didFilterMediaLibraryElements', {
      location: 'content-manager',
      filter: Object.keys(nextFilters[nextFilters.length - 1])[0],
    });
    setQueryObject(prev => ({ ...prev, page: 1, filters: { $and: nextFilters } }));
  };

  const handleChangePageSize = pageSize => {
    setQueryObject(prev => ({ ...prev, pageSize: parseInt(pageSize, 10), page: 1 }));
  };

  const handeChangePage = page => {
    setQueryObject(prev => ({ ...prev, page }));
  };

  const handleChangeSort = sort => {
    trackUsage('didSortMediaLibraryElements', {
      location: 'content-manager',
      sort,
    });
    setQueryObject(prev => ({ ...prev, sort }));
  };

  const handleChangeSearch = _q => {
    if (_q) {
      setQueryObject(prev => ({ ...prev, _q, page: 1 }));
    } else {
      const newState = { page: 1 };

      Object.keys(queryObject).forEach(key => {
        if (!['page', '_q'].includes(key)) {
          newState[key] = queryObject[key];
        }
      });

      setQueryObject(newState);
    }
  };

  const handleChangeFolder = folder => {
    setQueryObject(prev => ({ ...prev, folder: folder ?? null }));
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
