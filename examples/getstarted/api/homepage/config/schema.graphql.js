module.exports = {
  query: `

    customQuery: String
    customQuery2: String
    restaurantByAddress: Homepage
    q1: Homepage

  `,
  resolver: {
    Query: {
      customQuery: {
        policies: [], // consider that the local policies are in the api which is created this file
        resolverOf: 'application::restaurant.restaurant.find',
        resolver() {},
      },
      customQuery2: {
        policies: [], // consider that the local policies are in the api which is created this file
        resolver: 'application::restaurant.restaurant.find',
      },
      restaurantByAddress: {
        policies: [], // consider that the local policies are in the api which is created this file
        resolverOf: 'application::address.address.find',
        resolver: 'application::homepage.homepage.find',
      },
      q1: {
        policies: ['test'],
        resolverOf: 'application::restaurant.restaurant.find',
        resolver(root, args, ctx) {
          return {
            id: 1,
            title: 'coucou',
          };
        },
      },
    },
  },
};
