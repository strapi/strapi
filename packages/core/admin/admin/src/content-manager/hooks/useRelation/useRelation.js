import { useState } from 'react';
import { useQuery } from 'react-query';

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
  const [relationsRange, setRelationsLoadRange] = useState([0, relationsToShow]);

  const fetchRelations = () => {
    return Promise.resolve(FIXTURE_RELATIONS.slice(-1 * relationsRange[1]));
  };

  const fetchSearch = () => {
    return Promise.resolve(FIXTURE_SEARCH.filter(curr => curr.title.includes(searchTerm)));
  };

  const relationsRes = useQuery(['relations', ...relationsRange], fetchRelations);

  const searchRes = useQuery(['relation', 'search', searchTerm], fetchSearch, {
    enabled: !!searchTerm,
  });

  const search = term => {
    setSearchTerm(term);
  };

  const load = (startIndex, count) => {
    setRelationsLoadRange([startIndex, startIndex + count]);
  };

  return { relations: relationsRes, searchResults: searchRes, search, load };
};
