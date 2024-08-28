import { Filters } from '@strapi/admin/strapi-admin';

const containsMimeTypeFilter = (query: Filters.Query | null) => {
  const filters = query?.filters?.$and;

  if (!filters) {
    return false;
  }

  const result = filters.find((filter) => {
    return Object.keys(filter).includes('mime');
  });

  return !!result;
};

export const containsAssetFilter = (query: Filters.Query | null) => {
  return containsMimeTypeFilter(query);
};
