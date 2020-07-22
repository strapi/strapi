const getAsyncSearchableData = async (contentType, searchQuery) => {
  const result = await strapi.query(contentType).search({ _q: searchQuery });
  return result.map(item => ({ ...item, __contentType: contentType }));
};

const fetchAsyncSearchableData = async (contentTypes, searchQuery) => {
  const requests = contentTypes.map(contentType => {
    return getAsyncSearchableData(contentType, searchQuery);
  });
  return Promise.all(requests);
};

module.exports = {
  async search(ctx) {
    console.log(strapi.contentTypes)
    const body = JSON.parse(ctx.request.body);
    const searchQuery = body.searchQuery;
    const searchableContentTypes = Object.entries(strapi.contentTypes)
      .filter(([_key, value]) => value.options.searchable)
      .map(([_key, value]) => value.info.name);

    return fetchAsyncSearchableData(searchableContentTypes, searchQuery);
  }
};
