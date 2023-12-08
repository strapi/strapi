interface Query {
  plugins?: Record<string, unknown>;
  _q?: string;
  [key: string]: any;
}

/**
 * @description
 * Creates a valid query params object for get requests
 * ie. plugins[18n][locale]=en becomes locale=en
 */
const buildValidGetParams = (query: Query = {}) => {
  // Extract pluginOptions from the query, they shouldn't be part of the URL
  const {
    plugins: _,
    _q: searchQuery,
    ...validQueryParams
  } = {
    ...query,
    ...Object.values(query?.plugins ?? {}).reduce<Record<string, unknown>>(
      (acc, current) => Object.assign(acc, current),
      {}
    ),
  };

  if (searchQuery) {
    // Encode the search query here since the paramsSerializer will not
    validQueryParams._q = encodeURIComponent(searchQuery);
  }

  return validQueryParams;
};

export { buildValidGetParams };
