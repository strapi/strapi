import { useState } from 'react';
import { useQuery, useInfiniteQuery } from 'react-query';

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
];

export const useRelation = ({ relationsToShow = 10 }) => {
  const [searchTerm, setSearchTerm] = useState(null);

  const fetchRelations = ({ pageParam = 1 }) => {
    const startIndex = (pageParam - 1) * relationsToShow;
    return Promise.resolve(FIXTURE_RELATIONS.slice(startIndex, startIndex + relationsToShow));
  };

  const fetchSearch = () => {
    return Promise.resolve(FIXTURE_SEARCH.filter(curr => curr.title.includes(searchTerm)));
  };

  const relationsRes = useInfiniteQuery(['relations'], fetchRelations, {
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < relationsToShow) {
        return undefined;
      }

      return (pages?.length || 0) + 1;
    },
  });

  const searchRes = useQuery(['relation', 'search', searchTerm], fetchSearch, {
    enabled: !!searchTerm,
  });

  const search = term => {
    setSearchTerm(term);
  };

  return { relations: relationsRes, searchResults: searchRes, search };
};
