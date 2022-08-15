import { useState } from 'react';
import { useInfiniteQuery } from 'react-query';

import { axiosInstance } from '../../../core/utils';

export const useRelation = ({ name, relationsToShow = 10, searchResultsToShow = 10 }) => {
  const [searchTerm, setSearchTerm] = useState(null);

  const fetchRelations = async ({ pageParam = 1 }) => {
    // TODO: use relations endpoint
    const { data } = await axiosInstance.get(`?page=${pageParam}`);

    return data;
  };

  const fetchSearch = async ({ pageParam = 1 }) => {
    // TODO: use search endpoint
    const { data } = await axiosInstance.get(`?page=${pageParam}`);

    return data;
  };

  const relationsRes = useInfiniteQuery(['relation', name], fetchRelations, {
    getNextPageParam(lastPage, pages) {
      if (lastPage.length < relationsToShow) {
        return undefined;
      }

      // eslint-disable-next-line consistent-return
      return (pages?.length || 0) + 1;
    },
  });

  const searchRes = useInfiniteQuery(['relation', name, 'search', searchTerm], fetchSearch, {
    enabled: !!searchTerm,
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
