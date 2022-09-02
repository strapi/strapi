import { useState } from 'react';
import { useInfiniteQuery } from 'react-query';

// import { axiosInstance } from '../../../core/utils';

const FIXTURE_RELATIONS = {
  values: [
    {
      id: 1,
      title: 'Relation 1',
      publishedAt: '2022',
    },

    {
      id: 2,
      title: 'Relation 2',
      publishedAt: '',
    },

    {
      id: 3,
      title: 'Relation 3',
    },

    {
      id: 4,
      title: 'Relation with a very long title',
    },

    {
      id: 5,
      title: 'Another important entity',
    },

    {
      id: 6,
      title: 'Are we going to play this game really?',
    },

    {
      id: 7,
      title: 'Indeed ...',
    },
    {
      id: 8,
      title: 'Just a little more',
    },
    {
      id: 8,
      title: 'One last?',
    },
  ],

  pagination: {
    page: 1,
    total: 3,
  },
};

const FIXTURE_SEARCH = {
  values: [
    {
      id: 1,
      title: 'Relation 1',
      publishedAt: '2022',
    },

    {
      id: 2,
      title: 'Relation 2',
      publishedAt: '',
    },

    {
      id: 3,
      title: 'Relation 3',
    },

    {
      id: 4,
      title: 'Relation with a very long title',
    },

    {
      id: 5,
      title: 'Another important entity',
    },

    {
      id: 6,
      title: 'Are we going to play this game really?',
    },

    {
      id: 7,
      title: 'Indeed ...',
    },
  ],

  pagination: {
    page: 1,
    total: 1,
  },
};

export const useRelation = (cacheKey, { relation /* search */ }) => {
  const [searchTerm, setSearchTerm] = useState(null);

  const fetchRelations = async (/* { pageParam = 1 } */) => {
    try {
      // const { data } = await axiosInstance.get(relation?.endpoint, {
      //   ...(relation.pageParams ?? {}),
      //   page: pageParam,
      // });

      if (relation?.onLoad) {
        relation.onLoad(FIXTURE_RELATIONS);
        // relation.onLoad(data);
      }

      // TODO: remove
      return FIXTURE_RELATIONS;
      // return data;
    } catch (err) {
      // TODO: remove
      return FIXTURE_RELATIONS;
    }
  };

  const fetchSearch = async (/* { pageParam = 1 } */) => {
    // const { data } = await axiosInstance.get(search.endpoint, {
    //   ...(search.pageParams ?? {}),
    //   page: pageParam,
    // });

    return FIXTURE_SEARCH;
    // return data;
  };

  const relationsRes = useInfiniteQuery(['relation', cacheKey], fetchRelations, {
    enabled: !!relation?.endpoint,
    getNextPageParam(lastPage) {
      if (lastPage.pagination.page + 1 === lastPage.pagination.total) {
        return undefined;
      }

      // eslint-disable-next-line consistent-return
      return lastPage.pagination.page + 1;
    },
  });

  const searchRes = useInfiniteQuery(['relation', cacheKey, 'search', searchTerm], fetchSearch, {
    enabled: !!searchTerm,
    getNextPageParam(lastPage) {
      if (lastPage.pagination.page + 1 === lastPage.pagination.total) {
        return undefined;
      }

      // eslint-disable-next-line consistent-return
      return lastPage.pagination.page + 1;
    },
  });

  const searchFor = (term) => {
    searchRes.remove();
    setSearchTerm(term);
  };

  return { relations: relationsRes, search: searchRes, searchFor };
};
