module.exports = {
  contentSourceMaps: {
    enabled: true,
    origin: 'example.com',
    contentTypes: ['api::address.address', 'api::category.category'],
  },
  rest: {
    defaultLimit: 25,
    maxLimit: 30,
    withCount: true,
  },
};
