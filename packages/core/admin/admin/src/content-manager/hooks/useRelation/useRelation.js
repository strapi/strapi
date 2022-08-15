import { useState } from 'react';
import { useInfiniteQuery } from 'react-query';

import { axiosInstance } from '../../../core/utils';

export const useRelation = (
  name,
  { endpoints, relationsToShow = 10, searchResultsToShow = 10 }
) => {
  const [searchTerm, setSearchTerm] = useState(null);

  const fetchRelations = async ({ pageParam = 1 }) => {
    const { data } = await axiosInstance.get(endpoints?.relation, {
      page: pageParam,
    });

    return data;
  };

  const fetchSearch = async ({ pageParam = 1 }) => {
    const { data } = await axiosInstance.get(endpoints?.search, {
      page: pageParam,
    });

    return data;
  };

  const relationsRes = useInfiniteQuery(['relation', name], fetchRelations, {
    enabled: !!endpoints?.relation,
    getNextPageParam(lastPage, pages) {
      if (lastPage.length < relationsToShow) {
        return undefined;
      }

      // eslint-disable-next-line consistent-return
      return (pages?.length || 0) + 1;
    },
  });

  const searchRes = useInfiniteQuery(['relation', name, 'search', searchTerm], fetchSearch, {
    enabled: !!endpoints?.search && !!searchTerm,
    getNextPageParam(lastPage, pages) {
      if (lastPage.length < searchResultsToShow) {
        return undefined;
      }

      // eslint-disable-next-line consistent-return
      return (pages?.length || 0) + 1;
    },
  });

  const searchFor = (term) => {
    searchRes.remove();
    setSearchTerm(term);
  };

  return { relations: relationsRes, search: searchRes, searchFor };
};
