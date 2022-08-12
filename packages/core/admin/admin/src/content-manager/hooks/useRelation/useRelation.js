import { useState } from 'react';
import { useInfiniteQuery } from 'react-query';

const FIXTURE_RELATIONS = [
  {
    title: '1',
  },

  {
    title: '2',
  },

  {
    title: '3',
  },

  {
    title: '4',
  },

  {
    title: '5',
  },

  {
    title: '6',
  },

  {
    title: '7',
  },

  {
    title: '8',
  },

  {
    title: '9',
  },
];

const FIXTURE_SEARCH = [
  {
    title: 'Julie',
  },

  {
    title: 'Pierre',
  },

  {
    title: 'Gustav',
  },

  {
    title: 'Marc',
  },

  {
    title: 'lowercase u'
  },

  {
    title: 'more lowercase u'
  },

  {
    title: 'a lot lowercase us'
  }
];

export const useRelation = ({ name, relationsToShow = 10, relationsToSearch = 10 }) => {
  const [searchTerm, setSearchTerm] = useState(null);

  const fetchRelations = ({ pageParam = 1 }) => {
    const startIndex = (pageParam - 1) * relationsToShow;
    return Promise.resolve(FIXTURE_RELATIONS.slice(startIndex, startIndex + relationsToShow));
  };

  const fetchSearch = ({ pageParam = 1 }) => {
    const results = FIXTURE_SEARCH.filter(curr => curr.title.includes(searchTerm));
    const startIndex = (pageParam - 1) * relationsToSearch;

    return Promise.resolve(results.slice(startIndex, startIndex + relationsToSearch));
  };

  const relationsRes = useInfiniteQuery(['relation', name], fetchRelations, {
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < relationsToShow) {
        return undefined;
      }

      return (pages?.length || 0) + 1;
    },
  });

  const searchRes = useInfiniteQuery(['relation', name, 'search', searchTerm], fetchSearch, {
    enabled: !!searchTerm,
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < relationsToSearch) {
        return undefined;
      }

      return (pages?.length || 0) + 1;
    },
  });

  const searchFor = (term) => {
    searchRes.remove();
    setSearchTerm(term);
  }

  return { relations: relationsRes, search: searchRes, searchFor };
};
