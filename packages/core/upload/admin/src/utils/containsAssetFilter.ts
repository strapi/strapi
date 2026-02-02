import type { Query } from '../../../shared/contracts/files';

const containsMimeTypeFilter = (query: Query | null) => {
  const filters = query?.filters?.$and;

  if (!filters) {
    return false;
  }

  const result = filters.find((filter) => {
    return Object.keys(filter).includes('mime');
  });

  return !!result;
};

export const containsAssetFilter = (query: Query | null) => {
  return containsMimeTypeFilter(query);
};
